"use client";
import { GLBModel } from "./GLBModel";
import { useDebugUI } from "../hooks/useDebugUI";

interface CozyRoomProps {
  onLoad?: () => void;
}

export function CozyRoom({ onLoad }: CozyRoomProps) {
  const { model } = useDebugUI();
  const {
    position,
    scale,
    rotation,
    autoRotate,
    rotationSpeed,
  } = model;

  return (
    <GLBModel 
      url="/cozy_room.glb"
      position={position as [number, number, number]}
      scale={scale as [number, number, number]}
      rotation={rotation as [number, number, number]}
      autoRotate={autoRotate}
      rotationSpeed={rotationSpeed}
      onLoad={onLoad}
    />
  );
}
