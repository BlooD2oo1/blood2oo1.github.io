#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec2 position;
out vec2 vTexCoord;

#GLOBALS

void main()
{
    gl_Position = vec4(position, 0.0, 1.0);
    vTexCoord = position * 0.5 + 0.5; // Convert from [-1, 1] to [0, 1]
}
