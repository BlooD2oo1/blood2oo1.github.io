#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
layout(location = 0) out vec4 outColor0;
layout(location = 1) out vec4 outColor1;

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
	outColor0 = vec4(0);
	outColor1 = vec4(0);

	ivec2 tc = ivec2(vTexCoord * g_vRTRes);

	float fRockDepth = SampleDepth(vec2(tc))*0.4-0.01;
	fRockDepth = clamp(fRockDepth, -0.1, 0.2);
	//float fSandDepth = max(0.0, SampleDepth(vec2(tc + ivec2(2048, 2048))) * 0.2-0.007)*1.0;
	float fSandDepth = 0.0015*0.0;
	float fSolidDepth = fRockDepth + fSandDepth;

	outColor0.z = max(0.0, -fSolidDepth + 0.0)*0.0;
	outColor1.x = fRockDepth;
	outColor1.y = fSandDepth;
}