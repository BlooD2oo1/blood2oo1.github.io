#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec3 position;
//layout(location = 1) in vec2 normal;

#GLOBALS

void main()
{
    ivec2 viTexRes = textureSize(g_tTex1, 0);
    vec2 vTexRes = vec2(viTexRes);
    vec2 vTexCoord = position.xy + vec2(0.5) / vTexRes;
    ivec2 tc = ivec2(vTexCoord * vTexRes);
    vec4 vTex1C = texelFetch(g_tTex1, tc, 0);
    vec4 vTex2C = texelFetch(g_tTex2, tc, 0);
    float fZ1 = vTex1C.z + vTex2C.x + vTex2C.y;
    float fZ0 = -0.1;
    float fW = position.z;
    float fZ = mix(fZ0, fZ1, fW);

    vec3 modifiedPosition = vec3(position.xy - vec2(0.5), fZ);
	gl_Position = g_matVPShadow * vec4(modifiedPosition, 1.0);
}