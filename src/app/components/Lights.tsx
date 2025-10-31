"use client";
import { useRef, useEffect } from "react";
import { useHelper } from "@react-three/drei";
import * as THREE from "three";
import { useDebugUI } from "../hooks/useDebugUI";

export function Lights() {
  const { lighting } = useDebugUI();
  const {
    ambientIntensity,
    directionalIntensity,
    directionalPosition,
    directionalColor,
    pointIntensity,
    pointPosition,
    pointColor,
    pointLight2Intensity,
    pointLight2Position,
    pointLight2Color,
    pointLight3Intensity,
    pointLight3Position,
    pointLight3Color,
    showHelpers,
  } = lighting;

  const directionalLightRef = useRef<THREE.DirectionalLight>(null!);
  const pointLightRef = useRef<THREE.PointLight>(null!);
  const pointLight2Ref = useRef<THREE.PointLight>(null!);
  const pointLight3Ref = useRef<THREE.PointLight>(null!);

  // Configure shadow camera for directional light
  useEffect(() => {
    const directionalLight = directionalLightRef.current;
    if (!directionalLight) return;
    
    // Configure shadow camera bounds for the directional light
    directionalLight.shadow.camera.left = -3;
    directionalLight.shadow.camera.right = 3;
    directionalLight.shadow.camera.top = 3;
    directionalLight.shadow.camera.bottom = -5;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 3;
    
    // Set shadow map size for quality
    directionalLight.shadow.mapSize.width = 512;
    directionalLight.shadow.mapSize.height = 512;
  }, []);

  // Add helpers for directional and point lights
  useHelper(
    showHelpers ? directionalLightRef : null,
    THREE.DirectionalLightHelper,
    1,
    directionalColor
  );
  useHelper(
    showHelpers ? pointLightRef : null,
    THREE.PointLightHelper,
    0.5,
    pointColor
  );
  useHelper(
    showHelpers ? pointLight2Ref : null,
    THREE.PointLightHelper,
    0.5,
    pointLight2Color
  );
  useHelper(
    showHelpers ? pointLight3Ref : null,
    THREE.PointLightHelper,
    0.5,
    pointLight3Color
  );

  return (
    <>
      <ambientLight intensity={ambientIntensity} />

      <directionalLight
        ref={directionalLightRef}
        position={directionalPosition as [number, number, number]}
        intensity={directionalIntensity}
        color={directionalColor}
        castShadow
      />

      <pointLight
        castShadow
        ref={pointLightRef}
        position={pointPosition as [number, number, number]}
        intensity={pointIntensity}
        color={pointColor}
      />

      <pointLight
        castShadow
        ref={pointLight2Ref}
        position={pointLight2Position as [number, number, number]}
        intensity={pointLight2Intensity}
        color={pointLight2Color}
      />

      <pointLight
        castShadow
        ref={pointLight3Ref}
        position={pointLight3Position as [number, number, number]}
        intensity={pointLight3Intensity}
        color={pointLight3Color}
      />
    </>
  );
}
