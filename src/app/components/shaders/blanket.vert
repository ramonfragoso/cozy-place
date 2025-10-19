varying vec2 vUv;
void main()
{
    vUv = uv;
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    
    vec2 resolution = vec2(200, 200);

    gl_Position.xyz /= gl_Position.w;
    gl_Position.xy = floor(gl_Position.xy * resolution) / resolution;
    gl_Position.xyz *= gl_Position.w;
}