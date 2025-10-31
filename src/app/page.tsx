"use client";
import { Canvas } from "@react-three/fiber";
import { PointerLockControls, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useDebugUI } from "./hooks/useDebugUI";
import { Leva } from "leva";
import { CozyRoom } from "./components/CozyRoom";
import { Lights } from "./components/Lights";
import { Postprocessing } from "./components/Postprocessing";



export default function Home() {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const { camera, environment } = useDebugUI();

  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    cam.position.set(
      (camera.position as number[])[0],
      (camera.position as number[])[1],
      (camera.position as number[])[2]
    );
    cam.fov = camera.fov as number;
    cam.updateProjectionMatrix();
  }, [camera.position, camera.fov]);

  return (
    <div className="w-full h-screen">
      <div className="z-50 absolute max-h-[100vh] overflow-auto top-1 right-1 rounded-md max-w-[370px] ">
        <Leva fill />
      </div>
      
      <Canvas
        shadows
        dpr={[0.6, 0.7]}

        camera={{ position: camera.position as [number, number, number], fov: camera.fov as number, near: 0.1, far: 500 }}
        gl={{
          // antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0);
          cameraRef.current = camera as THREE.PerspectiveCamera;
        }}
      >
        {environment.enabled && (
          <Environment
            files="/hdr_high.hdr"
            background={environment.background as boolean}
            blur={environment.blur as number}
            backgroundRotation={environment.rotation}
            environmentRotation={environment.rotation}
          />
        )}
        {/* Sync environment/background intensity, rotation and blur with the scene when supported */}
        <Lights />
        <CozyRoom />
        {/* <OrbitControls/> */}
        <PointerLockControls  makeDefault />
        <Postprocessing />
      </Canvas>
    </div>
  );
}
