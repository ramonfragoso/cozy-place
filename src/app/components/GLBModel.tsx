"use client";
import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
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

  return (
    <group ref={modelRef} position={position} scale={scale} rotation={rotation}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the model for better performance
useGLTF.preload("/cozy_room.glb");
