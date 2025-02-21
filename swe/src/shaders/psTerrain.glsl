#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
in vec4 vShadowCoord;
out vec4 outColor;

#GLOBALS

void main()
{
    // Calculate shadow coordinates
    vec4 shadowCoord = vShadowCoord;
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.xyz = shadowCoord.xyz * 0.5 + 0.5;

    ivec2 vTexSize = textureSize(g_tTex, 0);
    ivec2 tc = ivec2(vTexCoord * vec2(vTexSize));
    vec4 vTexC = texelFetch(g_tTex, tc, 0);
    ivec2 tcDt = ivec2(vTexCoord * (vec2(vTexSize)+vec2(0.5)));
    vec4 vTexDtC = texelFetch(g_tTexNorm, tcDt, 0);
    //vec4 vTexDtR = texture(g_tTexNorm, vTexCoord + vec2(0.5)/vTexRes + vec2(1.0/vTexRes.x,0.0));
    //vec4 vTexDtB = texture(g_tTexNorm, vTexCoord + vec2(0.5)/vTexRes + vec2(0.0,1.0/vTexRes.y));
    vec4 vTexDtR = (tc.x < vTexSize.x - 1) ? texelFetchOffset(g_tTexNorm, tcDt, 0, ivec2(1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexDtB = (tc.y < vTexSize.y - 1) ? texelFetchOffset(g_tTexNorm, tcDt, 0, ivec2(0, 1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);

    // Calculate occlusion
    vec2 dC = vTexDtC.xy;
    vec2 dR = vTexDtR.xy;
    vec2 dB = vTexDtB.xy;

    float fOcc = 1.0 - clamp(length(dC - dR) + length(dC - dB), 0.0, 1.0);
    fOcc = pow( fOcc*0.8+0.2, 0.5 );
    
    float fWater = smoothstep( 0.0, 0.005, vTexC.z );
    float fFoam = ( length(vTexDtC.xy) * length(vTexC.xy) ) * 5.0 / clamp(0.001, 1.0, vTexC.z * 1000.0);
	fFoam += smoothstep(0.005, 0.0002, vTexC.z);//part
	fFoam = clamp(fFoam, 0.0, 1.0);
    float fNormalBoostOnWater = mix(1.0, 0.6, fWater);
    vec3 vNormal = normalize( vec3( -vTexDtC.xy, g_fGridSizeInMeter* fNormalBoostOnWater) );
    
    vec3 vCWater = mix( g_vCWaterShallow, g_vCWaterDeep, smoothstep( 0.0, 0.03, vTexC.z ) );
	vec3 vCFoam = vec3(1.0);
    vec3 vCLand = mix(g_vCLand01, g_vCLand02, clamp(vTexC.w * 10.1, 0.0, 1.0));

    vCWater = mix( vCWater, vCFoam, fFoam );

    vec3 vDiffuse = mix(vCLand, vCWater, fWater );

    vec2 fShadow_fDist = PCFShadow(g_tShadowMap, shadowCoord, mix( 1.0, 2.0, fWater ), vTexCoord );


    float fSSS = ( 1.0 - fOcc ) * fWater;
    //float fSSS = ( 1.0-(vNormal.z*0.5+0.5) ) * fWater;
    vec3 g_vCWaterSSS = vec3(0.1, 0.7, 0.3) * 0.8;

    vec3 vCAmbientUp = g_vCAmbientUp * fOcc;
    vec3 vCAmbientDown = g_vCAmbientDown * fOcc;

    float fSSSShadowW = 1.0-clamp( fShadow_fDist.y, 0.0, 0.03 )/0.03;
    vCAmbientUp += fSSS * g_vCWaterSSS * fSSSShadowW;
    vCAmbientDown += fSSS * g_vCWaterSSS * fSSSShadowW;
    
    vec3 vColor = Shade(g_vLightDir, g_vCLight*fShadow_fDist.x, vCAmbientUp, vCAmbientDown, vNormal, vDiffuse, mix( 0.9, 0.3, fWater ), mix(0.04, 0.1, fWater), g_vViewDir);

    outColor.rgb = vColor;
    outColor.a = 1.0;
    
    outColor.rgb = max(outColor.rgb, 0.0);
    outColor.rgb = 1.0 - exp(-outColor.rgb);
    outColor.rgb = pow(outColor.rgb, vec3(0.454545));

    //outColor.rgb = vec3(1.0-clamp( fShadow_fDist.y, 0.0, 0.05 )/0.05);
}
