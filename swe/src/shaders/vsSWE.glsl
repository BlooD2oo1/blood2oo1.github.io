#version 300 es
precision highp float;
in vec2 position;
in vec2 texCoord;
out vec2 vTexCoord;
void main()
{
    gl_Position = vec4(position, 0.0, 1.0);
    vTexCoord = position * 0.5 + 0.5; // Convert from [-1, 1] to [0, 1]
}
