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
  const { blanket, glass, emissive, lighting } = useDebugUI();

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

  // Reactively sync debug UI changes to all shader uniforms
  useEffect(() => {
    const colorA = new THREE.Color(blanket.colorA as string);
    const colorB = new THREE.Color(blanket.colorB as string);
    
    materialsRef.current.forEach((material) => {
      material.uniforms.uColorA.value.copy(colorA);
      material.uniforms.uColorB.value.copy(colorB);
      material.uniforms.uStripeScale.value = blanket.stripeScale as number;
      material.uniforms.uColorDepth.value = blanket.colorDepth as number;
      material.uniforms.uDitherScale.value = blanket.ditherScale as number;
    });
  }, [blanket.colorA, blanket.colorB, blanket.stripeScale, blanket.colorDepth, blanket.ditherScale]);

  useEffect(() => {
    if (!scene) return;

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        // Ensure all meshes cast and receive shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Skip shader replacement for the monitor screen so it can remain emissive-friendly
        if (obj.name === "monitor screen") {
          return;
        }
        const originalMat = mesh.material as
          | MaterialWithMap
          | MaterialWithMap[];

        let originalTexture: THREE.Texture | null = null;
        if (Array.isArray(originalMat)) {
          for (const m of originalMat) {
            if (m && m.map) {
              originalTexture = m.map as THREE.Texture;
              break;
            }
          }
        } else if (originalMat && originalMat.map) {
          originalTexture = originalMat.map as THREE.Texture;
        }

        if (originalTexture) {
          const jitterMaterial = createJitterMaterial({
            map: originalTexture,
            colorDepth: blanket.colorDepth as number,
            ditherScale: blanket.ditherScale as number,
          });
          
          materialsRef.current.set(mesh, jitterMaterial);
          mesh.material = jitterMaterial;
          (mesh.material as THREE.Material).needsUpdate = true;
        }
      }
    });
  }, [scene, blanket.colorDepth, blanket.ditherScale]);

  // Make the object named "monitor screen" emit light using a RectAreaLight
  useEffect(() => {
    if (!scene) return;
    RectAreaLightUniformsLib.init();

    const screensNames = ["monitorscreen", "fanbulb", "tvscreen"]
    const screens = screensNames.map((screenName) => scene.getObjectByName(screenName) as THREE.Mesh | null);
    if (!screen || !!!screens.length) return;

    // Try to make the screen surface itself emissive (if supported by its material)
    const setEmissive = (m: THREE.Material) => {
      if (isEmissiveMaterial(m)) {
        m.emissive.set(0xffffff);
        if (typeof (m as { emissiveIntensity?: number }).emissiveIntensity === "number") {
          (m as { emissiveIntensity?: number }).emissiveIntensity = 1.5;
        }
        m.needsUpdate = true;
      }
    };

    screens.forEach(screen => {
      const screenMaterial = screen?.material as THREE.Material | THREE.Material[];
      if (Array.isArray(screenMaterial)) {
        screenMaterial.forEach(setEmissive);
      } else if (screenMaterial) {
        setEmissive(screenMaterial);
      }
      
      const geometry = (screen?.geometry as THREE.BufferGeometry) || null;
      let width = 0.5;
      let height = 0.3;
      if (geometry) {
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        if (geometry.boundingBox) {
          const size = new THREE.Vector3();
          geometry.boundingBox.getSize(size);
          width = Math.max(0.01, size.x);
          height = Math.max(0.01, size.y);
        }
      }
      
      const rectLight = new THREE.RectAreaLight(0xffffff, 15, width, height);
      rectLight.name = `${screen?.name}-screen-light`;
      rectLight.position.set(0, 0, 0.01);
      rectLight.lookAt(0, 0, 1);
      
      screen?.add(rectLight);
      screenLightRef.current = rectLight;
      screenLightRefs.current.push(rectLight);

      // helpers are added by a separate effect reacting to the UI flag
    })
      
    return () => {
      // remove helpers first
      for (const helper of screenLightHelperRefs.current) {
        if (helper.parent) helper.parent.remove(helper);
      }
      screenLightHelperRefs.current = [];

      // then remove lights
      if (screenLightRef.current && screenLightRef.current.parent) {
        screenLightRef.current.parent.remove(screenLightRef.current);
      }
      screenLightRef.current = null;
      for (const light of screenLightRefs.current) {
        if (light.parent) light.parent.remove(light);
      }
      screenLightRefs.current = [];
    };
  }, [scene]);

  // Reactively update emissive intensities, colors and screen rect lights from debug UI
  useEffect(() => {
    if (!scene) return;

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
      if (Array.isArray(screenMaterial)) {
        screenMaterial.forEach(setEmissiveIntensity);
      } else if (screenMaterial) {
        setEmissiveIntensity(screenMaterial);
      }

      const rectLight = screen.getObjectByName(`${screen.name}-screen-light`) as THREE.RectAreaLight | null;
      if (rectLight) {
        if (screen.name === "monitorscreen") {
          rectLight.intensity = emissive.monitorIntensity as number;
          rectLight.color = new THREE.Color(emissive.monitorColor as string);
          const [rx, ry, rz] = emissive.monitorRotation as unknown as [number, number, number];
          rectLight.rotation.set(rx, ry, rz);
        } else if (screen.name === "tvscreen") {
          rectLight.intensity = emissive.tvIntensity as number;
          rectLight.color = new THREE.Color(emissive.tvColor as string);
          const [rx, ry, rz] = emissive.tvRotation as unknown as [number, number, number];
          rectLight.rotation.set(rx, ry, rz);
        } else {
          rectLight.intensity = emissive.rectLightIntensity as number;
        }
      }
    });
  }, [scene, emissive.intensity, emissive.rectLightIntensity, emissive.monitorIntensity, emissive.monitorColor, emissive.monitorRotation, emissive.tvIntensity, emissive.tvColor, emissive.tvRotation]);

  // Toggle helpers for the emissive RectAreaLights
  useEffect(() => {
    // remove any existing helpers
    for (const helper of screenLightHelperRefs.current) {
      if (helper.parent) helper.parent.remove(helper);
    }
    screenLightHelperRefs.current = [];

    if (!lighting.showHelpers) return;

    for (const light of screenLightRefs.current) {
      const helper = new RectAreaLightHelper(light);
      light.add(helper);
      screenLightHelperRefs.current.push(helper);
    }
  }, [lighting.showHelpers]);

  // Assign custom glass-like material to the object named "window"
  useEffect(() => {
    if (!scene) return;

    const windowObj = scene.getObjectByName("window") as THREE.Mesh | null;
    if (!windowObj) return;

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
      side:
        (THREE as unknown as { FrontSide: number; BackSide: number; DoubleSide: number })[
          glass.side as "FrontSide" | "BackSide" | "DoubleSide"
        ] ?? THREE.BackSide,
    } as unknown as THREE.MeshPhysicalMaterialParameters);

    windowObj.material = glassMaterial;
    (windowObj.material as THREE.Material).needsUpdate = true;
  }, [
    scene,
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

  // Reactively update glass material from debug UI
  useEffect(() => {
    if (!scene) return;
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
  }, [scene, glass.metalness, glass.roughness, glass.envMapIntensity, glass.clearcoat, glass.transparent, glass.transmission, glass.thickness, glass.opacity, glass.ior, glass.side]);

  useEffect(() => {
    if (!scene || !animations || animations.length === 0) return;
    const fanObject = scene.getObjectByName("fan");
    if (!fanObject) return;

    // Gather all tracks that target the fan node
    const fanTracks: THREE.KeyframeTrack[] = [];
    for (const clip of animations) {
      for (const track of clip.tracks) {
        if (track.name.startsWith("fan.")) {
          fanTracks.push(track);
        }
      }
    }

    if (fanTracks.length === 0) return;

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
  }, [scene, animations]);

  return (
    <group ref={modelRef} position={position} scale={scale} rotation={rotation}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the model for better performance
useGLTF.preload("/cozy_room.glb");
