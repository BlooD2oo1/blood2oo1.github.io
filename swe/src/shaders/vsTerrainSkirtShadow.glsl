#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec3 position;
//layout(location = 1) in vec2 normal;

#GLOBALS

void main()
{
    float fZScale = 1.0;
    vec2 vTexCoord = position.xy;
    ivec2 tc = ivec2(vTexCoord * vec2(textureSize(g_tTex, 0)));
    vec4 vTexC = texelFetch(g_tTex, tc, 0);
    float fZ1 = (vTexC.w + vTexC.z) * fZScale;
    float fZ0 = -0.25;
    float fW = position.z;
    float fZ = mix(fZ0, fZ1, fW);

    vec3 modifiedPosition = vec3(position.xy - vec2(0.5), fZ);
	gl_Position = g_matVPShadow * vec4(modifiedPosition, 1.0);
}