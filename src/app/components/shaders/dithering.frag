uniform float uColorDepth;
uniform float uDitherScale;

// YUV conversion functions
vec4 RGBtoYUV(vec4 rgba) {
    vec4 yuva;
    yuva.r = rgba.r * 0.2126 + 0.7152 * rgba.g + 0.0722 * rgba.b;
    yuva.g = (rgba.b - yuva.r) / 1.8556;
    yuva.b = (rgba.r - yuva.r) / 1.5748;
    yuva.a = rgba.a;

    yuva.gb += 0.5;

    return yuva;
}

vec4 YUVtoRGB(vec4 yuva) {
    yuva.gb -= 0.5;
    return vec4(
        yuva.r * 1.0 + yuva.g * 0.0 + yuva.b * 1.5748,
        yuva.r * 1.0 + yuva.g * -0.187324 + yuva.b * -0.468124,
        yuva.r * 1.0 + yuva.g * 1.8556 + yuva.b * 0.0,
        yuva.a);
}

float ditherChannelError(float col, float colMin, float colMax)
{
    float range = abs(colMin - colMax);
    float aRange = abs(col - colMin);
    return aRange / range;
}

// 8x8 Bayer matrix arrays
const float dither0[8] = float[8](0.0, 32.0, 8.0, 40.0, 2.0, 34.0, 10.0, 42.0);
const float dither1[8] = float[8](48.0, 16.0, 56.0, 24.0, 50.0, 18.0, 58.0, 26.0);
const float dither2[8] = float[8](12.0, 44.0, 4.0, 36.0, 14.0, 46.0, 6.0, 38.0);
const float dither3[8] = float[8](60.0, 28.0, 52.0, 20.0, 62.0, 30.0, 54.0, 22.0);
const float dither4[8] = float[8](3.0, 35.0, 11.0, 43.0, 1.0, 33.0, 9.0, 41.0);
const float dither5[8] = float[8](51.0, 19.0, 59.0, 27.0, 49.0, 17.0, 57.0, 25.0);
const float dither6[8] = float[8](15.0, 47.0, 7.0, 39.0, 13.0, 45.0, 5.0, 37.0);
const float dither7[8] = float[8](63.0, 31.0, 55.0, 23.0, 61.0, 29.0, 53.0, 21.0);

float dither8x8(vec2 position, float scale, float brightness)
{
    int x = int(mod(position.x / scale, 8.0));
    int y = int(mod(position.y / scale, 8.0));

    float limit = 0.0;

    if (x < 8) {
        float d;
        if (x == 0) {
            d = dither0[y];
        } else if (x == 1) {
            d = dither1[y];
        } else if (x == 2) {
            d = dither2[y];
        } else if (x == 3) {
            d = dither3[y];
        } else if (x == 4) {
            d = dither4[y];
        } else if (x == 5) {
            d = dither5[y];
        } else if (x == 6) {
            d = dither6[y];
        } else if (x == 7) {
            d = dither7[y];
        }

        limit = (d + 1.0) / 64.0;
    }

    return brightness < limit ? 0.0 : 1.0;
}

vec4 ditherAndPosterize(vec2 position, vec4 color, float colorDepth, float ditherScale)
{
    vec4 yuv = RGBtoYUV(color);

    vec4 col1 = floor(yuv * colorDepth) / colorDepth;
    vec4 col2 = ceil(yuv * colorDepth) / colorDepth;

    yuv.x = mix(col1.x, col2.x, dither8x8(position, ditherScale, ditherChannelError(yuv.x, col1.x, col2.x)));
    yuv.y = mix(col1.y, col2.y, dither8x8(position, ditherScale, ditherChannelError(yuv.y, col1.y, col2.y)));
    yuv.z = mix(col1.z, col2.z, dither8x8(position, ditherScale, ditherChannelError(yuv.z, col1.z, col2.z)));

    return YUVtoRGB(yuv);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor)
{
    vec4 color = inputColor;
    
    // Apply dithering and posterization
    color = ditherAndPosterize(gl_FragCoord.xy, color, uColorDepth, uDitherScale);
    
    outputColor = color;
}