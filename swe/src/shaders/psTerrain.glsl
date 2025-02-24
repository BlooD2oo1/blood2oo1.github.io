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

    ivec2 viTexRes = textureSize(g_tTex, 0);
	vec2 vTexRes = vec2(viTexRes);
    vec4 vTexC = texture(g_tTex, vTexCoord);
    vec4 vTexDtC = texture(g_tTexNorm, vTexCoord + vec2(0.5) / vTexRes);
    vec4 vTexDtR = texture(g_tTexNorm, vTexCoord + vec2(0.5) / vTexRes + vec2(1.0 / vTexRes.x, 0.0));
    vec4 vTexDtB = texture(g_tTexNorm, vTexCoord + vec2(0.5) / vTexRes + vec2(0.0, 1.0 / vTexRes.y));

    //ivec2 tc = ivec2(vTexCoord * vec2(vTexSize));
    //vec4 vTexC = texelFetch(g_tTex, tc, 0);	
    //ivec2 tcDt = ivec2(vTexCoord * (vec2(vTexSize)+vec2(0.5)));
    //vec4 vTexDtC = texelFetch(g_tTexNorm, tcDt, 0);
    //vec4 vTexDtR = (tc.x < vTexSize.x - 1) ? texelFetchOffset(g_tTexNorm, tcDt, 0, ivec2(1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    //vec4 vTexDtB = (tc.y < vTexSize.y - 1) ? texelFetchOffset(g_tTexNorm, tcDt, 0, ivec2(0, 1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);

    // Calculate occlusion
    vec2 dC = vTexDtC.xy;
    vec2 dR = vTexDtR.xy;
    vec2 dB = vTexDtB.xy;

    float fOcc = 1.0 - clamp(length(dC - dR) + length(dC - dB), 0.0, 1.0);
    fOcc = pow( fOcc*0.8+0.2, 0.5 );
    
    float fWater = smoothstep( 0.0, 0.005, vTexC.z );
    float fFoam = ( length(vTexDtC.xy) * length(vTexC.xy) ) * 7.0 / clamp(0.001, 1.0, vTexC.z * 100.0);
	fFoam += smoothstep(0.005, 0.0002, vTexC.z);//part
	fFoam = clamp(fFoam, 0.0, 1.0);
    float fNormalBoostOnWater = mix(1.0, 0.6, fWater);
    vec3 vNormal = normalize( vec3( -vTexDtC.xy, fNormalBoostOnWater) );
    
    vec3 vCWater = mix( g_vCWaterShallow, g_vCWaterDeep, smoothstep( 0.0, 0.03, vTexC.z ) );
	vec3 vCFoam = vec3(0.9);
    vec3 vCLand = mix(g_vCLand01, g_vCLand02, clamp(vTexC.w * 10.1, 0.0, 1.0));

    vCWater = mix( vCWater, vCFoam, fFoam );

    vCWater = vec3( abs( vTexC.xy ), vCWater.b );

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
    
    vec3 vColor = Shade(g_vLightDir, g_vCLight*fShadow_fDist.x, vCAmbientUp, vCAmbientDown, vNormal, vDiffuse, mix( 0.9, mix( 0.4, 0.8, fFoam ), fWater ), mix(0.04, 0.05, fWater), g_vViewDir);

    outColor0.rgb = vColor;
    outColor0.a = 1.0;
	outColor1 = vec4(vNormal, vScreenCoord.z);
    
    //outColor.rgb = vec3(1.0-clamp( fShadow_fDist.y, 0.0, 0.05 )/0.05);
}
