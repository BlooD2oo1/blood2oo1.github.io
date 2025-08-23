#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 normal;

#GLOBALS

out vec2 vTexCoord;
out vec4 vShadowCoord;
out vec4 screencoord;
out vec2 vNormalXY;
out float fZPos;


void main()
{
    ivec2 viTexRes = textureSize(g_tTex1, 0);
    vec2 vTexRes = vec2(viTexRes);
    vTexCoord = position.xy + vec2(0.5) / vTexRes;
    ivec2 tc = ivec2(vTexCoord * vTexRes);
    vec4 vTex1C = texelFetch(g_tTex1, tc, 0);
    vec4 vTex2C = texelFetch(g_tTex2, tc, 0);
    float fZ1 = vTex1C.z + vTex2C.x + vTex2C.y;
    float fZ0 = -0.1;
    float fW = position.z;
    fZPos = mix( fZ0, fZ1, fW);
    vec3 modifiedPosition = vec3(position.xy - vec2(0.5), fZPos);
    vShadowCoord = g_matVPShadow * vec4(modifiedPosition, 1.0);
    gl_Position = g_matVP * vec4(modifiedPosition, 1.0);
    screencoord = gl_Position;
	vNormalXY = normal;
}