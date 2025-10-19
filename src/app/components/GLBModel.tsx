"use client";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createBlanketMaterial } from "./shaders/createBlanketMaterial";
import { useDebugUI } from "../hooks/useDebugUI";

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

export function GLBModel({
  url,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  autoRotate = false,
  rotationSpeed = 0.01,
}: GLBModelProps) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);
  const { blanket } = useDebugUI();

  // Auto-rotate animation
  useFrame(() => {
    if (modelRef.current && autoRotate) {
      modelRef.current.rotation.y += rotationSpeed;
    }
  });

  // Create blanket shader material once (texture assigned after GLTF loads)
  const blanketMaterial = useMemo(() => createBlanketMaterial(), []);

  // Reactively sync debug UI changes to shader uniforms
  useEffect(() => {
    const colorA = new THREE.Color(blanket.colorA as string);
    const colorB = new THREE.Color(blanket.colorB as string);
    blanketMaterial.uniforms.uColorA.value.copy(colorA);
    blanketMaterial.uniforms.uColorB.value.copy(colorB);
    blanketMaterial.uniforms.uStripeScale.value = blanket.stripeScale as number;
    blanketMaterial.uniforms.uColorDepth.value = blanket.colorDepth as number;
    blanketMaterial.uniforms.uDitherScale.value = blanket.ditherScale as number;
  }, [blanket.colorA, blanket.colorB, blanket.stripeScale, blanket.colorDepth, blanket.ditherScale, blanketMaterial]);
  const objects = useMemo(() => [
    // "rightleg",
    // "shelf001",
    // "pumpkin",
    "blanket",
    // "window",
    // "floor",
    // "walls",
    // "wall",
    // "wall001",
    // "pillow",
    // "pillow001",
    // "pillow002",
    // "vase001",
    // "BezierCurve001",
    // "leaf030",
    // "BezierCurve002",
    // "leaf002",
    // "BezierCurve004",
    // "leaf003",
    // "BezierCurve005",
    // "BezierCurve006",
    // "BezierCurve007",
    // "BezierCurve008",
    // "BezierCurve009",
    // "BezierCurve",
    // "vase",
    // "BezierCurve003",
    // "leaf001",
    // "table",
    // "tablelegs",
  ], []);

  useEffect(() => {
    if (!scene) return;

    const lowerIncludes = (name?: string) =>
      objects.includes((name || "").toLowerCase());

    scene.traverse((obj) => {
      console.log("obj:", obj.name);
      if ((obj as THREE.Mesh).isMesh && lowerIncludes(obj.name)) {
        const mesh = obj as THREE.Mesh;
        const originalMat = mesh.material as
          | MaterialWithMap
          | MaterialWithMap[];

        // Support multi-material meshes by picking the first with a map
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
          blanketMaterial.uniforms.map.value = originalTexture;
        }

        mesh.material = blanketMaterial;
        (mesh.material as THREE.Material).needsUpdate = true;
      }
    });
  }, [scene, blanketMaterial, objects]);

  return (
    <group ref={modelRef} position={position} scale={scale} rotation={rotation}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the model for better performance
useGLTF.preload("/cozy_room.glb");
