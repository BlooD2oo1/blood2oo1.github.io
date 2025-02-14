#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D uTexture;
uniform vec2 uRTRes;

void main()
{
    ivec2 tc = ivec2(vTexCoord*uRTRes);
    vec4 vTex = texelFetch(uTexture, tc, 0);
    outColor = vTex;
}