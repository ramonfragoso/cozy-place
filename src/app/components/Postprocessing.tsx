"use client";
import { useEffect, useMemo } from "react";
import { EffectComposer } from "@react-three/postprocessing";
import { DitheringEffect } from "./shaders/DitheringEffect";
import { useDebugUI } from "../hooks/useDebugUI";

export function Postprocessing() {
  const { postprocessing } = useDebugUI();

  // Create the effect instance
  const effect = useMemo(() => {
    return new DitheringEffect({
      colorDepth: postprocessing.colorDepth as number,
      ditherScale: postprocessing.ditherScale as number,
    });
  }, [postprocessing.colorDepth, postprocessing.ditherScale]);

  useEffect(() => {
    if (effect) {
      effect.setColorDepth(postprocessing.colorDepth as number);
      effect.setDitherScale(postprocessing.ditherScale as number);
    }
  }, [effect, postprocessing.colorDepth, postprocessing.ditherScale]);

  if (!postprocessing.enabled) {
    return null;
  }

  return (
    <EffectComposer>
      <primitive object={effect} />
    </EffectComposer>
  );
}
