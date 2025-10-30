"use client";
import * as THREE from "three";
import vert from "./jitter.vert";
import frag from "./jitter.frag";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

export function createJitterMaterial(params?: {
  colorA?: THREE.ColorRepresentation;
  colorB?: THREE.ColorRepresentation;
  stripeScale?: number;
  map?: THREE.Texture;
  colorDepth?: number;
  ditherScale?: number;
}): CustomShaderMaterial {
  const material = new CustomShaderMaterial({
    baseMaterial: THREE.MeshPhongMaterial,
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uColorA: { value: new THREE.Color(params?.colorA ?? "#c44e4e") },
      uColorB: { value: new THREE.Color(params?.colorB ?? "#f1d29f") },
      uStripeScale: { value: params?.stripeScale ?? 20.0 },
      uColorDepth: { value: params?.colorDepth ?? 8.0 },
      uDitherScale: { value: params?.ditherScale ?? 2.0 },
      map: { value: params?.map ?? null },
    },
  });

  material.name = "JitterShaderMaterial";
  material.transparent = false;
  material.depthWrite = true;
  material.depthTest = true;

  return material;
}
