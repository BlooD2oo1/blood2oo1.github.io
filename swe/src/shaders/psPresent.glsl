#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D uTexture;
uniform vec2 uMousePosition;

void main()
{
    outColor = texture(uTexture, vTexCoord);
    outColor.b += pow( 1.0 - length( vTexCoord - uMousePosition ), 4.0 );
    outColor.a = 1.0;
}
