#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
in vec4 vShadowCoord;
in vec4 screencoord;
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

    vec4 vTexDtC = texture(g_tTexNorm, vTexCoord + vec2(0.5) / vTexRes);
    vec4 vTexDtR = texture(g_tTexNorm, vTexCoord + vec2(0.5) / vTexRes + vec2(1.0 / vTexRes.x, 0.0));
    vec4 vTexDtB = texture(g_tTexNorm, vTexCoord + vec2(0.5) / vTexRes + vec2(0.0, 1.0 / vTexRes.y));

    // Calculate occlusion
    vec2 dC = vTexDtC.xy;
    vec2 dR = vTexDtR.xy;
    vec2 dB = vTexDtB.xy;

    float fOcc = 1.0 - clamp(length(dC - dR) + length(dC - dB), 0.0, 1.0);
    fOcc = pow( fOcc*0.8+0.2, 0.5 );
    
    float fWaterMin = 0.0004;
    float fWater = smoothstep( 0.0, fWaterMin, vTex1C.z );
    float fFoam = ( length(vTexDtC.xy) * length(vTex1C.xy) ) * 7.0 / clamp(0.001, 1.0, vTex1C.z * 100.0);
	fFoam += smoothstep(0.003, 0.0, vTex1C.z);//part
	fFoam = clamp(fFoam, 0.0, 1.0);
    float fNormalBoostOnWater = 1.0;//mix(1.0, 0.6, fWater);
    vec3 vNormal = normalize( vec3( -vTexDtC.xy, fNormalBoostOnWater) );
    
    vec3 vCWater = mix( g_vCWaterShallow, g_vCWaterDeep, smoothstep( 0.0, 0.01, vTex1C.z ) );
    //vCWater = mix( vCWater, g_vCWaterMud, clamp( vTex2C.y*1000.0, 0.0, 1.0 ) );
	vec3 vCFoam = vec3(0.9);
    vec3 vCLand = mix(g_vCLandRock, g_vCLandSand, clamp( vTex2C.y*1000.0, 0.0, 1.0 ) );

    vCWater = mix( vCWater, vCFoam, fFoam );
	
    vec3 vDiffuse = mix(vCLand, vCWater, fWater );

    vec2 fShadow_fDist = PCFShadow(g_tShadowMap, shadowCoord.xyz, mix( 1.0, 2.0, fWater ), vTexCoord );

    float fSSS = ( 1.0 - fOcc ) * fWater;
    //float fSSS = ( 1.0-(vNormal.z*0.5+0.5) ) * fWater;
    vec3 g_vCWaterSSS = vec3(0.1, 0.7, 0.3) * 0.8;

    vec3 vCAmbientUp = g_vCAmbientUp * fOcc;
    vec3 vCAmbientDown = g_vCAmbientDown * fOcc;
    
    float fSSSShadowW = 1.0-clamp( fShadow_fDist.y, 0.0, 0.03 )/0.03;
    vCAmbientUp += fSSS * g_vCWaterSSS * fSSSShadowW;
    vCAmbientDown += fSSS * g_vCWaterSSS * fSSSShadowW;
    
    vec3 vColor = Shade(g_vLightDir, g_vCLight*fShadow_fDist.x, vCAmbientUp, vCAmbientDown, vNormal, vDiffuse, mix( 0.96, mix( 0.4, 0.8, fFoam ), fWater ), mix(0.04, 0.05, fWater), g_vViewDir);

	//vColor = mix( vColor, vec3( abs( vTex1C.w )*1000.0 ), fWater );

    outColor0.rgb = vColor;
    outColor0.a = 1.0;
	outColor1 = vec4(vNormal, vScreenCoord.z);
    
    //outColor0.rgb = vec3(1.0-clamp( fShadow_fDist.y, 0.0, 0.05 )/0.05);
    //outColor0.rgb = mix( outColor0.rgb, vec3( length( vTex1C.xy )*20.0 ), fWater );
    //outColor0.rgb = mix( outColor0.rgb, vec3( abs( vTex1C.xy )*20.0, 0.1 ), fWater );

	
}
