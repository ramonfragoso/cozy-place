"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useRef, useState, Suspense } from "react";
import { useDebugUI } from "./hooks/useDebugUI";
import { CozyRoom } from "./components/CozyRoom";
import { Lights } from "./components/Lights";
import { Postprocessing } from "./components/Postprocessing";
import { Leva } from "leva";



export default function Home() {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const { camera, environment } = useDebugUI();
  const [isLoading, setIsLoading] = useState(true);

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
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <p className="text-white text-lg font-medium font-mono animate-pulse">loading</p>
          </div>
        </div>
      )}
      <div className="z-50 absolute max-h-[100vh] overflow-auto top-1 right-1 rounded-md max-w-[370px] "> 
        <Leva hidden  fill />
      </div>
      
      {/* Scroll to zoom indicator */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20">
        <svg 
          className="w-5 h-5 text-white animate-pulse" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {/* Mouse shape */}
          <rect x="6" y="2" width="12" height="20" rx="3" stroke="currentColor" strokeWidth={2} />
          {/* Scroll wheel indicator */}
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            stroke="currentColor"
            d="M12 5v3M12 11v3" 
          />
        </svg>
        <span className="text-white text-sm font-mono animate-pulse">scroll to zoom in/out</span>
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
          camera.lookAt(-4, 1,-1);
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
        <Suspense fallback={null}>
          <CozyRoom onLoad={() => setIsLoading(false)} />
        </Suspense>
        {/* <OrbitControls/> */}
        <PointerLockControls  makeDefault />
        <Postprocessing />
      </Canvas>
    </div>
  );
}

const ZOOM_LEVELS = [1.2, 0.5, 0.2]; 

function WheelZoom({ baseFov }: { baseFov: number }) {
  const { camera } = useThree();
  const [zoomLevel, setZoomLevel] = useState(0); 
  const baseFovRef = useRef(baseFov);
  const targetFovRef = useRef(baseFov * ZOOM_LEVELS[0]);

  useEffect(() => {
    baseFovRef.current = baseFov;
    targetFovRef.current = baseFov * ZOOM_LEVELS[zoomLevel];
  }, [baseFov, zoomLevel]);

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
