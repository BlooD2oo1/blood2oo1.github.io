#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
out vec4 outColor;

#GLOBALS

//	tex1:
//		x: velocity x+1/2
//		y: velocity y+1/2
//		z: water depth
//		w: -
//	tex2:
//		x: rock depth
//		y: sand depth
//		z: -
//		w: -

void main()
{
	ivec2 tc = ivec2(vTexCoord * g_vRTRes);

	vec4 vTex1C = texelFetch(g_tTex1, tc, 0);
	vec4 vTex1L = (tc.x > 0)					? texelFetchOffset(g_tTex1, tc, 0, ivec2(-1, 0))	: vTex1C * vec4(0.0, 0.0, 1.0, 1.0);
	vec4 vTex1R = (tc.x < int(g_vRTRes.x) - 1)	? texelFetchOffset(g_tTex1, tc, 0, ivec2(1, 0))		: vTex1C * vec4(0.0, 0.0, 1.0, 1.0);
	vec4 vTex1T = (tc.y > 0)					? texelFetchOffset(g_tTex1, tc, 0, ivec2(0, -1))	: vTex1C * vec4(0.0, 0.0, 1.0, 1.0);
	vec4 vTex1B = (tc.y < int(g_vRTRes.y) - 1)	? texelFetchOffset(g_tTex1, tc, 0, ivec2(0, 1))		: vTex1C * vec4(0.0, 0.0, 1.0, 1.0);

	vec4 vTex2C = texelFetch(g_tTex2, tc, 0);
	vec4 vTex2L = (tc.x > 0)					? texelFetchOffset(g_tTex2, tc, 0, ivec2(-1, 0))	: vTex2C * vec4(1.0, 1.0, 1.0, 1.0);
	vec4 vTex2R = (tc.x < int(g_vRTRes.x) - 1)	? texelFetchOffset(g_tTex2, tc, 0, ivec2(1, 0))		: vTex2C * vec4(1.0, 1.0, 1.0, 1.0);
	vec4 vTex2T = (tc.y > 0)					? texelFetchOffset(g_tTex2, tc, 0, ivec2(0, -1))	: vTex2C * vec4(1.0, 1.0, 1.0, 1.0);
	vec4 vTex2B = (tc.y < int(g_vRTRes.y) - 1)	? texelFetchOffset(g_tTex2, tc, 0, ivec2(0, 1))		: vTex2C * vec4(1.0, 1.0, 1.0, 1.0);

	////////////////////////////////////////////////////////////////

	float hC = vTex1C.z + vTex2C.x + vTex2C.y;
	float hR = vTex1R.z + vTex2R.x + vTex2R.y;
	float hB = vTex1B.z + vTex2B.x + vTex2B.y;

	vec2 vV;
	vV.x = (hR - hC) * g_vRTRes.x;
	vV.y = (hB - hC) * g_vRTRes.y;

	outColor = vec4(0);
	outColor.xy = vV;

}