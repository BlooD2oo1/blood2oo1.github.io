#version 300 es
precision highp float;

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 normal;

#GLOBALS

out vec2 vTexCoord;
out vec4 vShadowCoord;
out vec2 vNormalXY;
out vec2 vW;


void main()
{
    float fZScale = 1.0;
    vTexCoord = position.xy;
    ivec2 tc = ivec2(vTexCoord * vec2(textureSize(g_tTex, 0)));
    vec4 vTexC = texelFetch(g_tTex, tc, 0);
    float fZ1 = (vTexC.w + vTexC.z) * fZScale;
    float fZC = vTexC.w * fZScale;
    float fZ0 = -0.1;
    float fW = position.z;
    float fZ = mix( fZ0, fZ1, fW);
    vW = vec2(fZ, fZC);
    vec3 modifiedPosition = vec3(position.xy - vec2(0.5), fZ);
    vShadowCoord = g_matVPShadow * vec4(modifiedPosition, 1.0);
    gl_Position = g_matVP * vec4(modifiedPosition, 1.0);
	vNormalXY = normal;
}