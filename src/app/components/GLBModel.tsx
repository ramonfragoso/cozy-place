"use client";
import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
import { useDebugUI } from "../hooks/useDebugUI";
import { createJitterMaterial } from "./shaders/createJitterMaterial";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

interface GLBModelProps {
  url: string;
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  autoRotate?: boolean;
  rotationSpeed?: number;
}

type MaterialWithMap =
  | (THREE.MeshStandardMaterial & { map?: THREE.Texture | null })
  | (THREE.MeshPhysicalMaterial & { map?: THREE.Texture | null })
  | (THREE.MeshBasicMaterial & { map?: THREE.Texture | null })
  | (THREE.MeshPhongMaterial & { map?: THREE.Texture | null })
  | (THREE.MeshLambertMaterial & { map?: THREE.Texture | null })
  | (THREE.MeshToonMaterial & { map?: THREE.Texture | null })
  | (THREE.MeshMatcapMaterial & { map?: THREE.Texture | null })
  | (THREE.Material & { map?: THREE.Texture | null });

type EmissiveMaterial =
  | THREE.MeshStandardMaterial
  | THREE.MeshPhysicalMaterial
  | THREE.MeshPhongMaterial
  | THREE.MeshLambertMaterial
  | THREE.MeshToonMaterial;

const isEmissiveMaterial = (m: THREE.Material): m is EmissiveMaterial => {
  return (m as unknown as { emissive?: unknown }).emissive !== undefined;
};

export function GLBModel({
  url,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  autoRotate = false,
  rotationSpeed = 0.01,
}: GLBModelProps) {
  const { scene, animations } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const screenLightRef = useRef<THREE.RectAreaLight | null>(null);
  const screenLightRefs = useRef<THREE.RectAreaLight[]>([]);
  const screenLightHelperRefs = useRef<RectAreaLightHelper[]>([]);
  const { blanket, glass, emissive, lighting, surfaces } = useDebugUI();

  // Auto-rotate animation
  useFrame((_, delta) => {
    if (modelRef.current && autoRotate) {
      modelRef.current.rotation.y += rotationSpeed;
    }
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  // Store materials for each mesh
  const materialsRef = useRef<Map<THREE.Mesh, CustomShaderMaterial>>(new Map());

  // Single orchestrated effect
  useEffect(() => {
    if (!scene) return;

    const isSurfaceTarget = (name: string) => {
      const lower = name.toLowerCase();
      return lower === "floor" || lower.includes("wall");
    };

    const syncBlanketUniforms = () => {
      const colorA = new THREE.Color(blanket.colorA as string);
      const colorB = new THREE.Color(blanket.colorB as string);
      materialsRef.current.forEach((material) => {
        material.uniforms.uColorA.value.copy(colorA);
        material.uniforms.uColorB.value.copy(colorB);
        material.uniforms.uStripeScale.value = blanket.stripeScale as number;
        material.uniforms.uColorDepth.value = blanket.colorDepth as number;
        material.uniforms.uDitherScale.value = blanket.ditherScale as number;
      });
    };

    const ensureJitterMaterials = () => {
      scene.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (obj.name === "monitor screen" || isSurfaceTarget(obj.name)) return;

        const originalMat = mesh.material as MaterialWithMap | MaterialWithMap[];
        let originalTexture: THREE.Texture | null = null;
        if (Array.isArray(originalMat)) {
          for (const m of originalMat) {
            if (m && m.map) { originalTexture = m.map as THREE.Texture; break; }
          }
        } else if (originalMat && originalMat.map) {
          originalTexture = originalMat.map as THREE.Texture;
        }
        if (!originalTexture) return;
        if (materialsRef.current.has(mesh)) return; // already replaced

        const jitterMaterial = createJitterMaterial({
          map: originalTexture,
          colorDepth: blanket.colorDepth as number,
          ditherScale: blanket.ditherScale as number,
        });
        materialsRef.current.set(mesh, jitterMaterial);
        mesh.material = jitterMaterial;
        (mesh.material as THREE.Material).needsUpdate = true;
      });
    };

    const updateSurfacePBR = () => {
      scene.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        if (!isSurfaceTarget(obj.name)) return;
        const applyToMat = (m: THREE.Material) => {
          const maybeMetal = m as unknown as { metalness?: number };
          const maybeRough = m as unknown as { roughness?: number };
          let updated = false;
          if (typeof maybeMetal.metalness === "number") { maybeMetal.metalness = surfaces.metalness as number; updated = true; }
          if (typeof maybeRough.roughness === "number") { maybeRough.roughness = surfaces.roughness as number; updated = true; }
          if (updated) m.needsUpdate = true;
        };
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m && applyToMat(m)); else if (mat) applyToMat(mat as THREE.Material);
      });
    };

    const ensureScreenRectLights = () => {
      RectAreaLightUniformsLib.init();
      const screensNames = ["monitorscreen", "fanbulb", "tvscreen"];
      const screens = screensNames.map((screenName) => scene.getObjectByName(screenName) as THREE.Mesh | null);
      if (!screens.length) return () => {};
      const createdLights: THREE.RectAreaLight[] = [];

      const setEmissive = (m: THREE.Material) => {
        if (isEmissiveMaterial(m)) {
          m.emissive.set(0xffffff);
          if (typeof (m as { emissiveIntensity?: number }).emissiveIntensity === "number") {
            (m as { emissiveIntensity?: number }).emissiveIntensity = 1.5;
          }
          m.needsUpdate = true;
        }
      };

      screens.forEach((screen) => {
        if (!screen) return;
        const screenMaterial = screen.material as THREE.Material | THREE.Material[];
        if (Array.isArray(screenMaterial)) screenMaterial.forEach(setEmissive); else if (screenMaterial) setEmissive(screenMaterial);

        const lightName = `${screen.name}-screen-light`;
        const existing = screen.getObjectByName(lightName) as THREE.RectAreaLight | null;
        if (existing) return;

        const rectLight = new THREE.RectAreaLight(0xffffff, 15, 1, 1);
        rectLight.name = lightName;
        rectLight.position.copy(screen.position);
        const worldPos = new THREE.Vector3();
        const worldDir = new THREE.Vector3();
        screen.getWorldPosition(worldPos);
        screen.getWorldDirection(worldDir);
        rectLight.lookAt(worldPos.clone().add(worldDir));
        screen.add(rectLight);
        screenLightRef.current = rectLight;
        screenLightRefs.current.push(rectLight);
        createdLights.push(rectLight);
      });

      return () => {
        for (const helper of screenLightHelperRefs.current) {
          if (helper.parent) helper.parent.remove(helper);
        }
        screenLightHelperRefs.current = [];
        for (const light of createdLights) {
          if (light.parent) light.parent.remove(light);
        }
        screenLightRefs.current = screenLightRefs.current.filter((l) => !createdLights.includes(l));
        if (screenLightRef.current && createdLights.includes(screenLightRef.current)) {
          screenLightRef.current = null;
        }
      };
    };

    const syncEmissiveAndRectLights = () => {
      const screensNames = ["monitorscreen", "fanbulb", "tvscreen"];
      const screens = screensNames.map((screenName) => scene.getObjectByName(screenName) as THREE.Mesh | null);
      if (!screens.length) return;
      const setEmissiveIntensity = (m: THREE.Material) => {
        if (isEmissiveMaterial(m)) {
          if (typeof (m as { emissiveIntensity?: number }).emissiveIntensity === "number") {
            (m as { emissiveIntensity?: number }).emissiveIntensity = emissive.intensity as number;
            m.needsUpdate = true;
          }
        }
      };
      screens.forEach((screen) => {
        if (!screen) return;
        const screenMaterial = screen.material as THREE.Material | THREE.Material[];
        if (Array.isArray(screenMaterial)) screenMaterial.forEach(setEmissiveIntensity); else if (screenMaterial) setEmissiveIntensity(screenMaterial);
        const rectLight = screen.getObjectByName(`${screen.name}-screen-light`) as THREE.RectAreaLight | null;
        if (!rectLight) return;
        if (screen.name === "monitorscreen") {
          rectLight.intensity = (emissive.monitorIntensity as number) ?? (emissive.rectLightIntensity as number);
          rectLight.color = new THREE.Color(emissive.monitorColor as string);
          const [rx, ry, rz] = emissive.monitorRotation as unknown as [number, number, number];
          rectLight.rotation.set(rx, ry, rz);
          const [px, py, pz] = emissive.monitorPosition as unknown as [number, number, number];
          rectLight.position.set(px, py, pz);
        } else if (screen.name === "tvscreen") {
          rectLight.intensity = (emissive.tvIntensity as number) ?? (emissive.rectLightIntensity as number);
          rectLight.color = new THREE.Color(emissive.tvColor as string);
          const [rx, ry, rz] = emissive.tvRotation as unknown as [number, number, number];
          rectLight.rotation.set(rx, ry, rz);
          const [px, py, pz] = emissive.tvPosition as unknown as [number, number, number];
          rectLight.position.set(px, py, pz);
        } else {
          rectLight.intensity = emissive.rectLightIntensity as number;
        }
      });
    };

    const toggleHelpers = () => {
      for (const helper of screenLightHelperRefs.current) {
        if (helper.parent) helper.parent.remove(helper);
      }
      screenLightHelperRefs.current = [];
      if (!lighting.showHelpers) return;
      for (const light of screenLightRefs.current) {
        const helper = new RectAreaLightHelper(light);
        screenLightHelperRefs.current.push(helper);
      }
    };

    const ensureWindowGlass = () => {
      const windowObj = scene.getObjectByName("window") as THREE.Mesh | null;
      if (!windowObj) return;
      const mat = windowObj.material as THREE.Material | undefined;
      const needsNew = !(mat instanceof THREE.MeshPhysicalMaterial);
      if (needsNew) {
        const glassMaterial = new THREE.MeshPhysicalMaterial({
          metalness: glass.metalness as number,
          roughness: glass.roughness as number,
          envMapIntensity: glass.envMapIntensity as number,
          clearcoat: glass.clearcoat as number,
          transparent: glass.transparent as boolean,
          transmission: glass.transmission as number,
          thickness: glass.thickness as number,
          opacity: glass.opacity as number,
          ior: glass.ior as number,
          side: (THREE as unknown as { FrontSide: number; BackSide: number; DoubleSide: number })[
            glass.side as "FrontSide" | "BackSide" | "DoubleSide"
          ] ?? THREE.BackSide,
        } as unknown as THREE.MeshPhysicalMaterialParameters);
        windowObj.material = glassMaterial;
        (windowObj.material as THREE.Material).needsUpdate = true;
      }
    };

    const updateWindowGlass = () => {
      const windowObj = scene.getObjectByName("window") as THREE.Mesh | null;
      if (!windowObj) return;
      const mat = windowObj.material as THREE.MeshPhysicalMaterial | undefined;
      if (!mat) return;
      mat.metalness = glass.metalness as number;
      mat.roughness = glass.roughness as number;
      mat.envMapIntensity = glass.envMapIntensity as number;
      mat.clearcoat = glass.clearcoat as number;
      mat.transparent = glass.transparent as boolean;
      if (typeof mat.transmission === "number") mat.transmission = glass.transmission as number;
      if (typeof mat.thickness === "number") mat.thickness = glass.thickness as number;
      mat.opacity = glass.opacity as number;
      if (typeof mat.ior === "number") mat.ior = glass.ior as number;
      const sideValue = (THREE as unknown as { FrontSide: number; BackSide: number; DoubleSide: number })[
        glass.side as "FrontSide" | "BackSide" | "DoubleSide"
      ];
      if (typeof sideValue === "number") mat.side = sideValue as THREE.Side;
      mat.needsUpdate = true;
    };

    const ensureFanAnimation = () => {
      if (!animations || animations.length === 0) return () => {};
      if (mixerRef.current) return () => {};
      const fanObject = scene.getObjectByName("fan");
      if (!fanObject) return () => {};
      const fanTracks: THREE.KeyframeTrack[] = [];
      for (const clip of animations) {
        for (const track of clip.tracks) {
          if (track.name.startsWith("fan.")) fanTracks.push(track);
        }
      }
      if (fanTracks.length === 0) return () => {};
      mixerRef.current = new THREE.AnimationMixer(fanObject);
      const fanClip = new THREE.AnimationClip("fanOnly", -1, fanTracks);
      const action = mixerRef.current.clipAction(fanClip);
      action.play();
      return () => {
        if (mixerRef.current) {
          mixerRef.current.stopAllAction();
          mixerRef.current = null;
        }
      };
    };

    // run orchestrated steps
    ensureJitterMaterials();
    syncBlanketUniforms();
    updateSurfacePBR();
    const cleanupLights = ensureScreenRectLights();
    syncEmissiveAndRectLights();
    toggleHelpers();
    ensureWindowGlass();
    updateWindowGlass();
    const cleanupFan = ensureFanAnimation();

    return () => {
      if (cleanupLights) cleanupLights();
      if (cleanupFan) cleanupFan();
      // remove helpers on unmount
      for (const helper of screenLightHelperRefs.current) {
        if (helper.parent) helper.parent.remove(helper);
      }
      screenLightHelperRefs.current = [];
    };
  }, [
    scene,
    animations,
    // blanket
    blanket.colorA,
    blanket.colorB,
    blanket.stripeScale,
    blanket.colorDepth,
    blanket.ditherScale,
    // surfaces
    surfaces.metalness,
    surfaces.roughness,
    // emissive
    emissive.intensity,
    emissive.rectLightIntensity,
    emissive.monitorIntensity,
    emissive.monitorColor,
    emissive.monitorRotation,
    emissive.monitorPosition,
    emissive.tvIntensity,
    emissive.tvColor,
    emissive.tvRotation,
    emissive.tvPosition,
    // helpers
    lighting.showHelpers,
    // glass
    glass.metalness,
    glass.roughness,
    glass.envMapIntensity,
    glass.clearcoat,
    glass.transparent,
    glass.transmission,
    glass.thickness,
    glass.opacity,
    glass.ior,
    glass.side,
  ]);

  return (
    <group ref={modelRef} position={position} scale={scale} rotation={rotation}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the model for better performance
useGLTF.preload("/cozy_room.glb");
