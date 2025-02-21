#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
out vec4 outColor;

#GLOBALS

void main()
{
	//outColor = vec4( fract( vTexCoord*8.0 ), 0.0, 1.0);
	outColor = vec4(0);
    ivec2 tc = ivec2(vTexCoord * g_vRTRes);
	outColor.w = SampleDepth(vec2(tc));
	outColor.z = max(0.0, -outColor.w);
}