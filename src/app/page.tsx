"use client";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState, Suspense } from "react";
import { useDebugUI } from "./hooks/useDebugUI";
import { useIsMobile } from "./hooks/useIsMobile";
import { CozyRoom } from "./components/CozyRoom";
import { Lights } from "./components/Lights";
import { Postprocessing } from "./components/Postprocessing";
import { CameraControls } from "./components/CameraControls";
import { Leva } from "leva";

export default function Home() {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const { camera, environment } = useDebugUI();
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  return (
    <div className="w-full h-screen">
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <p className="text-white text-lg font-medium font-mono animate-pulse">
              loading
            </p>
          </div>
        </div>
      )}
      <div className="z-50 absolute max-h-[100vh] overflow-auto top-1 right-1 rounded-md max-w-[370px] ">
        <Leva hidden fill />
      </div>

      {/* Control instructions */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-2 flex-col">
        {isMobile ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20">
              <svg
                className="w-5 h-5 text-white animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {/* Touch/finger icon */}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  stroke="currentColor"
                  d="M12 4.5v15M7.5 12h9"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={2} />
              </svg>
              <span className="text-white text-sm font-mono animate-pulse">
                drag to rotate, pinch to zoom
              </span>
            </div>
          </>
        ) : (
          <>
        <div className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20">
          <svg
            className="w-5 h-5 text-white animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {/* Mouse shape */}
            <rect
              x="6"
              y="2"
              width="12"
              height="20"
              rx="3"
              stroke="currentColor"
              strokeWidth={2}
            />
            {/* Scroll wheel indicator */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              stroke="currentColor"
              d="M12 5v3M12 11v3"
            />
          </svg>
          <span className="text-white text-sm font-mono animate-pulse">
            scroll to zoom in/out
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20">
          <span className="text-white text-sm font-mono animate-pulse">press ESC to unlock the mouse cursor</span>
        </div>
          </>
        )}
      </div>
      <Canvas
        shadows
        dpr={[0.6, 0.7]}
        camera={{
          position: camera.position as [number, number, number],
          fov: camera.fov as number,
          near: 0.1,
          far: 500,
        }}
        gl={{
          // antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(-4, 1, -1);
          cameraRef.current = camera as THREE.PerspectiveCamera;
        }}
      >
        <CameraControls
          cameraPosition={camera.position as number[]}
          cameraFov={camera.fov as number}
          cameraRef={cameraRef}
        />
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
        <Postprocessing />
      </Canvas>
    </div>
  );
}
