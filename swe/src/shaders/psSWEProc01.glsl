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



void main()
{
    ivec2 tc = ivec2(vTexCoord*uRTRes);

    vec4 vTexC = texelFetch(uTexture, tc, 0);
    vec4 vTexR = (tc.x < int(uRTRes.x) - 1) ? texelFetchOffset(uTexture, tc, 0, ivec2(1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexB = (tc.y < int(uRTRes.y) - 1) ? texelFetchOffset(uTexture, tc, 0, ivec2(0, 1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);

    float zC = vTexC.z + vTexC.w;
    float zR = vTexR.z + vTexR.w;
    float zB = vTexB.z + vTexB.w;

    vec2 vV;
    vV.x = (zR - zC) * uRTRes.x;
    vV.y = (zB - zC) * uRTRes.y;
    
    outColor = vec4(0);
	outColor.xy = vV;


}