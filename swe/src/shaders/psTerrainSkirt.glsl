#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
in vec4 vShadowCoord;
in vec4 screencoord;
in vec2 vNormalXY;
in float fZPos;
layout(location = 0) out vec4 outColor0;
layout(location = 1) out vec4 outColor1;

#GLOBALS

void main()
{
    vec3 vScreenCoord = screencoord.xyz / screencoord.w;

    // Calculate shadow coordinates
    vec4 shadowCoord = vShadowCoord;
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.xyz = shadowCoord.xyz * 0.5 + 0.5;

    ivec2 viTexRes = textureSize(g_tTex1, 0);
    vec2 vTexRes = vec2(viTexRes);
    vec4 vTex1C = texture(g_tTex1, vTexCoord);
    vec4 vTex2C = texture(g_tTex2, vTexCoord);

    float fOcc = 1.0;

    float fWater = clamp((fZPos - (vTex2C.x+vTex2C.y)) / 0.005, 0.0, 1.0);
    float fFoam = 0.0;
    fFoam += smoothstep(0.0010, 0.0002, vTex1C.z);
    fFoam = clamp(fFoam, 0.0, 1.0);
    vec3 vNormal = vec3(vNormalXY, 0);

    vec3 vCWater = mix(g_vCWaterShallow, g_vCWaterDeep, smoothstep(0.0, 0.03, vTex1C.z));
    float fWaterDepth = (vTex1C.z + vTex2C.x+ vTex2C.y) - fZPos;
    vCWater = mix(vCWater, g_vCWaterDeep * 0.8, clamp(fWaterDepth / 0.01, 0.0, 1.0));
    //vCWater = mix( vCWater, g_vCWaterMud, clamp( vTexC2.y*1000.0, 0.0, 1.0 ) );
    vec3 vCFoam = vec3(1.0);
    vec3 vCLand = mix(g_vCLandRock, g_vCLandSand, clamp( vTex2C.y*1000.0, 0.0, 1.0 ) );
    //float fLandDepth = vTexC.w - fZPos;

    vCWater = mix(vCWater, vCFoam, fFoam);

    vec3 vDiffuse = mix(vCLand, vCWater, fWater);

    vec2 fShadow_fDist = PCFShadow(g_tShadowMap, shadowCoord.xyz, mix(1.0, 2.0, fWater), vTexCoord);

    vec3 vColor = Shade(g_vLightDir, g_vCLight * fShadow_fDist.x, g_vCAmbientUp * fOcc, g_vCAmbientDown * fOcc, vNormal, vDiffuse, mix(0.9, 0.3, fWater), mix(0.04, 0.1, fWater), g_vViewDir);

    outColor0.rgb = vColor;
    outColor0.a = 1.0;

    outColor1 = vec4(vNormal, vScreenCoord.z);
}