#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D uTexture;
uniform vec2 uRTRes;

// Velocity Advection

void main()
{
    const float g_fGridSizeInMeter = 5.0;
    const float g_fElapsedTimeInSec = 1.0;
    const float g_fAdvectSpeed = -1.0;
    const float g_fG = 10.0;
    const float g_fHackBlurDepth = 1.0;

    ivec2 tc = ivec2(vTexCoord*uRTRes);
    vec4 vTex = texelFetch(uTexture, tc, 0);

    float dt = -g_fAdvectSpeed * g_fElapsedTimeInSec / g_fGridSizeInMeter;
    vec2 v1 = vTex.xy;
    vec2 v2 = textureLod(uTexture, vTexCoord - ( 0.5 * v1 * dt ) / uRTRes, 0.0 ).xy;
    vec2 v3 = textureLod(uTexture, vTexCoord - ( 0.5 * v2 * dt ) / uRTRes, 0.0 ).xy;
    vec2 v4 = textureLod(uTexture, vTexCoord - ( v3 * dt ) / uRTRes, 0.0 ).xy;
    vec2 v = (1.0 * v1 + 2.0 * v2 + 2.0 * v3 + 1.0 * v4) / 6.0;
    
    outColor = textureLod(uTexture, vTexCoord + ( v * dt ) / uRTRes, 0.0);
}