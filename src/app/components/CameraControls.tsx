"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile";

// Component to offset camera position on mobile after OrbitControls updates
// This runs every frame to ensure the camera stays offset even when OrbitControls updates it
function MobileCameraOffset({ offsetY }: { offsetY: number }) {
  const { camera } = useThree();
  const baseYRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    
    if (!isInitializedRef.current) {
      // On first frame, store the base Y (what OrbitControls set)
      baseYRef.current = cam.position.y;
      isInitializedRef.current = true;
    }
    
    // Calculate what the natural Y should be (current - offset)
    const naturalY = cam.position.y;
    
    // If the natural Y has changed significantly, OrbitControls updated it
    if (baseYRef.current !== null && Math.abs(naturalY - baseYRef.current) > 0.1) {
      baseYRef.current = naturalY;
    }
    
    // Always maintain the offset
    if (baseYRef.current !== null) {
      cam.position.y = baseYRef.current + offsetY;
    }
  });

  return null;
}

const ZOOM_LEVELS = [1.2, 0.5, 0.2];

function WheelZoom({ baseFov }: { baseFov: number }) {
  const { camera } = useThree();
  const [zoomLevel, setZoomLevel] = useState(0);
  const baseFovRef = useRef(baseFov);
  const targetFovRef = useRef(baseFov * ZOOM_LEVELS[0]);
  const lastPinchDistance = useRef<number | null>(null);

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

    // Handle pinch-to-zoom on mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        lastPinchDistance.current = distance;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistance.current !== null) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const delta = lastPinchDistance.current - distance;
        
        if (Math.abs(delta) > 10) {
          setZoomLevel((currentLevel) => {
            if (delta > 0) {
              return Math.min(ZOOM_LEVELS.length - 1, currentLevel + 1);
            } else {
              return Math.max(0, currentLevel - 1);
            }
          });
          lastPinchDistance.current = distance;
        }
      }
    };

    const handleTouchEnd = () => {
      lastPinchDistance.current = null;
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const current = cam.fov;
    const target = targetFovRef.current;
    if (Math.abs(current - target) < 0.01) return;
    const lerpFactor = 1 - Math.pow(0.0001, delta); // time-independent smoothing
    cam.fov = THREE.MathUtils.lerp(current, target, lerpFactor);
    cam.updateProjectionMatrix();
  });

  return null;
}

interface CameraControlsProps {
  cameraPosition: number[];
  cameraFov: number;
  cameraRef?: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  onCameraCreated?: (camera: THREE.PerspectiveCamera) => void;
  mobileHeightOffset?: number;
  orbitTarget?: [number, number, number];
  orbitMaxDistance?: number;
  orbitMinPolarAngle?: number;
  orbitMaxPolarAngle?: number;
}

export function CameraControls({
  cameraPosition,
  cameraFov,
  cameraRef,
  onCameraCreated,
  mobileHeightOffset = 5,
  orbitTarget = [0, 3, -1],
  orbitMaxDistance = 1.4,
  orbitMinPolarAngle = Math.PI / 6,
  orbitMaxPolarAngle = Math.PI / 1.2,
}: CameraControlsProps) {
  const { camera } = useThree();
  const isMobile = useIsMobile();

  // Sync camera position and FOV from debug UI
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam) return;
    
    // Only update position for desktop (mobile is handled by MobileCameraOffset)
    if (!isMobile) {
      cam.position.set(
        cameraPosition[0],
        cameraPosition[1],
        cameraPosition[2]
      );
    }
    cam.fov = cameraFov;
    cam.updateProjectionMatrix();
  }, [camera, cameraPosition, cameraFov, isMobile]);

  // Store camera ref and call onCameraCreated callback
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (cameraRef) {
      cameraRef.current = cam;
    }
    if (onCameraCreated) {
      onCameraCreated(cam);
    }
  }, [camera, cameraRef, onCameraCreated]);

  return (
    <>
      <WheelZoom baseFov={cameraFov} />
      {isMobile ? (
        <>
          <OrbitControls
            makeDefault
            enableZoom={false}
            enablePan={false}
            maxDistance={orbitMaxDistance}
            minPolarAngle={orbitMinPolarAngle}
            maxPolarAngle={orbitMaxPolarAngle}
            target={orbitTarget}
          />
          {/* <MobileCameraOffset offsetY={mobileHeightOffset} /> */}
        </>
      ) : (
        <PointerLockControls makeDefault />
      )}
    </>
  );
}

