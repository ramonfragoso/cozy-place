uniform sampler2D map;
varying vec2 vUv;

void main()
{
  csm_DiffuseColor = texture2D(map, vUv);
}