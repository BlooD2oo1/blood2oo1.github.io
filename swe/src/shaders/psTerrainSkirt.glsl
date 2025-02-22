#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
in vec4 vShadowCoord;
in vec2 vNormalXY;
in float fZPos;
layout(location = 0) out vec4 outColor0;
layout(location = 1) out vec4 outColor1;

#GLOBALS

void main()
{
    // Calculate shadow coordinates
    vec4 shadowCoord = vShadowCoord;
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.xyz = shadowCoord.xyz * 0.5 + 0.5;

    ivec2 viTexRes = textureSize(g_tTex, 0);
    vec2 vTexRes = vec2(viTexRes);
    vec4 vTexC = texture(g_tTex, vTexCoord);

    float fOcc = 1.0;

    float fWater = clamp((fZPos - vTexC.w) / 0.005, 0.0, 1.0);
    float fFoam = 0.0;
    fFoam += smoothstep(0.0010, 0.0002, vTexC.z);
    fFoam = clamp(fFoam, 0.0, 1.0);
    vec3 vNormal = vec3(vNormalXY, 0);

    vec3 vCWater = mix(g_vCWaterShallow, g_vCWaterDeep, smoothstep(0.0, 0.03, vTexC.z));
    float fWaterDepth = (vTexC.z + vTexC.w) - fZPos;
    vCWater = mix(vCWater, g_vCWaterDeep * 0.8, clamp(fWaterDepth / 0.01, 0.0, 1.0));
    vec3 vCFoam = vec3(1.0);
    vec3 vCLand = mix(g_vCLand01, g_vCLand02, clamp(vTexC.w * 10.1, 0.0, 1.0));
    float fLandDepth = vTexC.w - fZPos;
    vCLand = mix(vCLand, g_vCLand02 * 0.9, clamp(fLandDepth / 0.2, 0.0, 1.0) * sin(fLandDepth / 0.006));

    vCWater = mix(vCWater, vCFoam, fFoam);

    vec3 vDiffuse = mix(vCLand, vCWater, fWater);

    vec2 fShadow_fDist = PCFShadow(g_tShadowMap, shadowCoord, mix(1.0, 2.0, fWater), vTexCoord);

    vec3 vColor = Shade(g_vLightDir, g_vCLight * fShadow_fDist.x, g_vCAmbientUp * fOcc, g_vCAmbientDown * fOcc, vNormal, vDiffuse, mix(0.9, 0.3, fWater), mix(0.04, 0.1, fWater), g_vViewDir);

    outColor0.rgb = vColor;
    outColor0.a = 1.0;

    outColor1 = vec4(vNormal, 0.5);
}