#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord; // Input texture coordinates
out vec4 outColor;

#GLOBALS

void main()
{
    ivec2 viTexRes = textureSize(g_tTex, 0);
    vec2 vTexRes = vec2(viTexRes);
	vec4 vTexMisc = texelFetch(g_tTex, ivec2(vTexCoord * vTexRes), 0);

    outColor.rgb = vec3(vTexMisc.rgb);
    outColor.a = 0.02;
}
