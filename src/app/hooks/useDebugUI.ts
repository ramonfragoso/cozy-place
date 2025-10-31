import { useControls } from "leva";

export const useDebugUI = () => {
  const lightingControls = useControls("Lighting", {
    ambientIntensity: { value: 5.3, min: 0, max: 20, step: 0.1 },
    directionalIntensity: { value: 0.8, min: 0, max: 10, step: 0.1 },
    directionalPosition: { value: [0, 10, 8], step: 0.5 },
    directionalColor: "#ffffff",
    pointIntensity: { value: 8, min: 0, max: 20, step: 0.1 },
    pointPosition: { value: [-3.38, 3.25, 0.69], step: 0.01 },
    pointColor: "#ef0707",
    pointLight2Intensity: { value: 650, min: 0, max: 3000, step: 0.1 },
    pointLight2Position: { value: [0, 5, 0], step: 0.1 },
    pointLight2Color: "#1fc72a",
    showHelpers: true,
  });

  const modelControls = useControls("Model", {
    position: { value: [0, 0, 0], step: 0.1 },
    scale: { value: [1, 1, 1], min: 0.1, max: 3, step: 0.1 },
    rotation: { value: [0, 0, 0], step: 0.1 },
    autoRotate: false,
    rotationSpeed: { value: 0.005, min: 0, max: 0.02, step: 0.001 },
  });

  const blanketControls = useControls("Blanket", {
    colorA: "#c44e4e",
    colorB: "#f1d29f",
    stripeScale: { value: 20, min: 0, max: 200, step: 1 },
    colorDepth: { value: 8, min: 2, max: 64, step: 1 },
    ditherScale: { value: 2, min: 0.1, max: 32, step: 0.1 },
  });

  const postprocessingControls = useControls("Postprocessing", {
    enabled: true,
    colorDepth: { value: 6, min: 2, max: 64, step: 1 },
    ditherScale: { value: 0.2, min: 0.1, max: 32, step: 0.1 },
  });

  const environmentControls = useControls("Environment", {
    enabled: true,
    background: true,
    rotation: { value: [0,5.23,0], step: 0.01 },
    blur: { value: 0, min: 0, max: 1, step: 0.01 },
    intensity: { value: 1, min: 0, max: 5, step: 0.05 },
  });

  const cameraControls = useControls("Camera", {
    position: { value: [-0.4, 2.3, -1.4], min: -10, max: 10, step: 0.1 },
    fov: { value: 80, min: 0, max: 100, step: 0.1 },
  });

  const emissiveControls = useControls("Emissive", {
    intensity: { value: 0.01, min: 0, max: 1, step: 0.001 },
    rectLightIntensity: { value: 15, min: 0, max: 1000, step: 0.5 },
    monitorIntensity: { value: 15, min: 0, max: 1000, step: 0.5 },
    monitorColor: "#ffffff",
    monitorRotation: { value: [0, 0, 0], step: 0.01 },
    monitorPosition: { value: [0, 0, 0.01], step: 0.01 },
    tvIntensity: { value: 15, min: 0, max: 2000, step: 0.5 },
    tvColor: "#ffffff",
    tvRotation: { value: [0, 0, 0], step: 0.01 },
    tvPosition: { value: [0, 0, 0.01], step: 0.01 },
  });

  const glassControls = useControls("Glass", {
    metalness: { value: 0.96, min: 0, max: 1, step: 0.01 },
    roughness: { value: 0.02, min: 0, max: 1, step: 0.01 },
    envMapIntensity: { value: 2.75, min: 0, max: 5, step: 0.01 },
    clearcoat: { value: 1, min: 0, max: 1, step: 0.01 },
    transparent: true,
    transmission: { value: 0.17, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0.15, min: 0, max: 2, step: 0.01 },
    opacity: { value: 0.24, min: 0, max: 1, step: 0.01 },
    ior: { value: 2.5, min: 0.5, max: 2.5, step: 0.01 },
    side: { value: "BackSide", options: ["FrontSide", "BackSide", "DoubleSide"] },
  });

  return {
    lighting: lightingControls,
    model: modelControls,
    blanket: blanketControls,
    postprocessing: postprocessingControls,
    environment: environmentControls,
    glass: glassControls,
    camera: cameraControls,
    emissive: emissiveControls,
  };
};
