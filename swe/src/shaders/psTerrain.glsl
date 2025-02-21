#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec4 vShadowCoord;
out vec4 outColor;

#GLOBALS

void main()
{
    float fZScale = 1.0;
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
    float fFoam = length(vTexDtC.xy) * length(vTexC.xy) * 10.0 / clamp(0.001, 1.0, vTexC.z * 1000.0);
	fFoam += smoothstep(0.005, 0.0002, vTexC.z);//part
	fFoam = clamp(fFoam, 0.0, 1.0);
    vec3 vNormal = normalize( vec3( -vTexDtC.xy, g_fGridSizeInMeter/fZScale ) );
    
    vec3 vCWater = mix( vec3(0.3, 0.7, 0.7), vec3(0.3, 0.6, 0.8)*0.7, smoothstep( 0.0, 0.02, vTexC.z ) )*0.4;
	vec3 vCFoam = vec3(1.0);
    vec3 vCLand = mix( vec3(0.6, 0.5, 0.3), vec3(0.6, 0.6, 0.5), clamp( vTexC.w*10.1, 0.0, 1.0 ) ) * 0.6;

    vCWater = mix( vCWater, vCFoam, fFoam );

    vec3 vDiffuse = mix(vCLand, vCWater, fWater );
   
    vec3 g_vCLight = vec3(1.0, 0.8, 0.5) * 7.0;
    vec3 g_vCAmbientUp = vec3(0.3, 0.5, 0.7) * 0.15;
    vec3 g_vCAmbientDown = vCLand * 0.01;

    // Apply PCF shadow filtering
    float shadow = PCFShadow(g_tShadowMap, shadowCoord, mix( 1.0, 2.0, fWater ), vTexCoord );
    vec3 vColor = Shade(g_vLightDir, g_vCLight*shadow, g_vCAmbientUp * fOcc, g_vCAmbientDown * fOcc, vNormal, vDiffuse, mix( 0.9, 0.3, fWater ), mix(0.04, 0.1, fWater), g_vViewDir);

    outColor.rgb = vColor;
    outColor.a = 1.0;
    //outColor.rgb = vec3(fOcc);

    outColor.rgb = max(outColor.rgb, 0.0);
    outColor.rgb = 1.0 - exp(-outColor.rgb);
    outColor.rgb = pow(outColor.rgb, vec3(0.454545));
}
