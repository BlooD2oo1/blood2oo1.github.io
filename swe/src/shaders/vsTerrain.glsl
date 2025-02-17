#version 300 es
precision highp float;
layout(std140, column_major) uniform;
layout(location = 0) in vec3 position;
out vec2 vTexCoord;

uniform mat4 uMVPMatrix;
uniform sampler2D uTexture;

void main() {
    vTexCoord = position.xy;
	vec4 vTexC = texture(uTexture, vTexCoord);
    vec3 modifiedPosition = vec3(position.xy-vec2(0.5), vTexC.w + vTexC.z); // Modify the z value with the texture sample
    gl_Position = uMVPMatrix * vec4(modifiedPosition, 1.0);
}