#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D uTexture;

void main()
{
    outColor = vec4( fract( vTexCoord*8.0 ), 0.0, 1.0);
}