#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D uTexture;
uniform vec2 uRTRes;
uniform float g_fGridSizeInMeter;
uniform float g_fElapsedTimeInSec;
uniform float g_fAdvectSpeed;
uniform float g_fG;
uniform float g_fHackBlurDepth;

// Height Integration

void main()
{
    ivec2 tc = ivec2(vTexCoord * uRTRes);

    vec4 vTexC = texelFetch(uTexture, tc, 0);
    vec4 vTexL = (tc.x > 0) ? texelFetchOffset(uTexture, tc, 0, ivec2(-1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexR = (tc.x < int(uRTRes.x) - 1) ? texelFetchOffset(uTexture, tc, 0, ivec2(1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexT = (tc.y > 0) ? texelFetchOffset(uTexture, tc, 0, ivec2(0, -1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexB = (tc.y < int(uRTRes.y) - 1) ? texelFetchOffset(uTexture, tc, 0, ivec2(0, 1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);

    vec2 vOffset = vTexC.xy / uRTRes.xy * g_fAdvectSpeed * g_fElapsedTimeInSec / g_fGridSizeInMeter;

    vec4 vTex = textureLod(uTexture, vTexCoord + vOffset, 0.0);

    if (vTexC.x == 0.0) vTex.xyz = vTexC.xyz;
    if (vTexC.y == 0.0) vTex.xyz = vTexC.xyz;

    vTex.zw = vTexC.zw;

    float fxL = vTexL.x;
    float fxR = vTexC.x;
    float fyT = vTexT.y;
    float fyB = vTexC.y;

    // We also found that it yields a more stable simulation:
    float hL = (vTexL.x >= 0.0) ? vTexL.z : vTexC.z;
    float hR = (vTexC.x <= 0.0) ? vTexR.z : vTexC.z;
    float hT = (vTexT.y >= 0.0) ? vTexT.z : vTexC.z;
    float hB = (vTexC.y <= 0.0) ? vTexB.z : vTexC.z;

    {
        // 2.2. Overshooting Reduction
        float beta = 2.0;
        float hAvgMax = beta * g_fGridSizeInMeter / (g_fG * (g_fElapsedTimeInSec));
        float hAdj = max(0.0, (vTexL.z + vTexR.z + vTexT.z + vTexB.z) / 4.0 - hAvgMax);

        hL -= hAdj;
        hR -= hAdj;
        hT -= hAdj;
        hB -= hAdj;
    }

    float dH = -((hR * fxR - hL * fxL) / g_fGridSizeInMeter + (hB * fyB - hT * fyT) / g_fGridSizeInMeter);

    vTexC.z += dH * (g_fElapsedTimeInSec);

    outColor = vTexC;
}