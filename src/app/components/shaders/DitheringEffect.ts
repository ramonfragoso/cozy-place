"use client";
import * as THREE from "three";
import { Effect } from "postprocessing";
import ditheringFrag from "./dithering.frag";

export class DitheringEffect extends Effect {
  constructor({
    colorDepth = 8.0,
    ditherScale = 2.0,
  }: {
    colorDepth?: number;
    ditherScale?: number;
  } = {}) {
    super("DitheringEffect", ditheringFrag, {
      uniforms: new Map([
        ["uColorDepth", new THREE.Uniform(colorDepth)],
        ["uDitherScale", new THREE.Uniform(ditherScale)],
      ]),
    });
  }

  setColorDepth(value: number) {
    this.uniforms.get("uColorDepth")!.value = value;
  }

  setDitherScale(value: number) {
    this.uniforms.get("uDitherScale")!.value = value;
  }
}
