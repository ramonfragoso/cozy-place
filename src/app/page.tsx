"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useDebugUI } from "./hooks/useDebugUI";
import { CozyRoom } from "./components/CozyRoom";
import { Lights } from "./components/Lights";
import { Postprocessing } from "./components/Postprocessing";
import { Leva } from "leva";



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
        <Leva hidden  fill />
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
        <WheelZoom baseFov={camera.fov as number} />
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

const ZOOM_LEVELS = [1.2, 0.5, 0.2]; 
const POINTER_SPEEDS = [1, 0.5, 0.25];

function WheelZoom({ baseFov }: { baseFov: number }) {
  const { camera } = useThree();
  const controls = useThree((state) => state.controls) as unknown as { pointerSpeed?: number } | undefined;
  const [zoomLevel, setZoomLevel] = useState(0); 
  const baseFovRef = useRef(baseFov);
  const targetFovRef = useRef(baseFov * ZOOM_LEVELS[0]);

  useEffect(() => {
    baseFovRef.current = baseFov;
    targetFovRef.current = baseFov * ZOOM_LEVELS[zoomLevel];
  }, [baseFov, zoomLevel]);

  useEffect(() => {
    if (controls && typeof controls.pointerSpeed === "number") {
      controls.pointerSpeed = POINTER_SPEEDS[zoomLevel] ?? 1;
    }
  }, [controls, zoomLevel]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Listen at document level so it works even when pointer is locked
      e.preventDefault();
      const delta = e.deltaY;
      setZoomLevel((currentLevel) => {
        if (delta > 0) {
          return Math.max(0, currentLevel - 1);
        } else {
          return Math.min(ZOOM_LEVELS.length - 1, currentLevel + 1);
        }
      });
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const current = cam.fov;
    const target = targetFovRef.current;
    if (Math.abs(current - target) < 0.01) return;
    // smooth damp towards target
    const lerpFactor = 1 - Math.pow(0.0001, delta); // time-independent smoothing
    cam.fov = THREE.MathUtils.lerp(current, target, lerpFactor);
    cam.updateProjectionMatrix();
  });

  return null;
}
