#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
out vec4 outColor;

#GLOBALS

void main()
{
    ivec2 tc = ivec2(vTexCoord*g_vRTRes);

    vec4 vTexC = texelFetch(g_tTex1, tc, 0);
    vec4 vTexR = (tc.x < int(g_vRTRes.x) - 1) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexB = (tc.y < int(g_vRTRes.y) - 1) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(0, 1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);

    float zC = vTexC.z + vTexC.w;
    float zR = vTexR.z + vTexR.w;
    float zB = vTexB.z + vTexB.w;

    vec2 vV;
    vV.x = (zR - zC) * g_vRTRes.x;
    vV.y = (zB - zC) * g_vRTRes.y;
    
    outColor = vec4(0);
	outColor.xy = vV;

}