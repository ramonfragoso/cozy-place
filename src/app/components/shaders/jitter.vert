varying vec2 vUv;
void main()
{
    vUv = uv;
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    csm_PositionRaw = projectionMatrix * modelViewPosition;
    
    vec2 resolution = vec2(200, 200);

    csm_PositionRaw.xyz /= csm_PositionRaw.w;
    csm_PositionRaw.xy = floor(csm_PositionRaw.xy * resolution) / resolution;
    csm_PositionRaw.xyz *= csm_PositionRaw.w;
}