#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
layout(location = 0) out vec4 outColor0;
layout(location = 1) out vec4 outColor1;

#GLOBALS

void main()
{
	outColor0 = vec4(0);
    ivec2 tc = ivec2(vTexCoord * g_vRTRes);
	outColor0.w = SampleDepth(vec2(tc));
	outColor0.z = max(0.0, -outColor0.w+0.0);

	outColor1 = vec4(0);
	outColor1.x = max( 0.0, SampleDepth(vec2(tc+ivec2(2048,2048)))*0.2 );
}