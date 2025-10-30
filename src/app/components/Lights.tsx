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
    showHelpers,
  } = lighting;

  const directionalLightRef = useRef<THREE.DirectionalLight>(null!);
  const pointLightRef = useRef<THREE.PointLight>(null!);
  const pointLight2Ref = useRef<THREE.PointLight>(null!);

  // Configure shadow camera for directional light
  useEffect(() => {
    const directionalLight = directionalLightRef.current;
    if (!directionalLight) return;
    
    // Configure shadow camera bounds for the directional light
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    
    // Set shadow map size for quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
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
    </>
  );
}
