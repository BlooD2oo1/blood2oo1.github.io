#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord; // Input texture coordinates
in vec4 screencoord;
in vec3 vWorldPos;
out vec4 outColor;

#GLOBALS

void main()
{
    ivec2 viTexRes = textureSize(g_tTex, 0);
    vec2 vTexRes = vec2(viTexRes);
	vec3 vScreenCoord = screencoord.xyz/ screencoord.w;
	vec4 vTexMisc = texelFetch(g_tTex, ivec2((vScreenCoord.xy*0.5+0.5) * vTexRes), 0);
	vec3 vNormal = vTexMisc.rgb;
	float fDepth = vTexMisc.a;

	// fDepth-bol es a g_matVPInv-bol szamitsd ki a vilag koordinatat:
	vec4 vWorldPosTerrain = g_matVPInv * vec4(vScreenCoord.xy, fDepth, 1.0);
	vWorldPosTerrain /= vWorldPosTerrain.w;
	vec3 vViewDir = g_vViewDir;

	float fLen = length( vWorldPosTerrain.xyz - vWorldPos );
	float fFog = clamp( 1.0 - exp(-fLen*1.0), 0.0, 1.0 );

    outColor.rgb = vec3(0.6, 0.7, 0.8)*0.6;
    outColor.a = fFog;
}
