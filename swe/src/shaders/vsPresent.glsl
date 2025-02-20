#version 300 es
precision highp float;
precision highp int;

in vec2 position;
in vec2 texCoord;
out vec2 vTexCoord;

#GLOBALS

void main()
{
    gl_Position = vec4(position, 0.0, 1.0);
    vTexCoord = texCoord;
}
