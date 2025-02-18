#version 300 es
precision highp float;

layout(location = 0) in vec3 position;
out vec2 vTexCoord;
out vec4 vShadowCoord;

uniform mat4 uMVPMatrix;
uniform mat4 uShadowMapMatrix;
uniform sampler2D uTexture;

void main() {
    float fZScale = 8.0;
    vTexCoord = position.xy;
	vec4 vTexC = texture(uTexture, vTexCoord);
    vec3 modifiedPosition = vec3(position.xy-vec2(0.5), (vTexC.w + vTexC.z)* fZScale); // Modify the z value with the texture sample
    vShadowCoord = uShadowMapMatrix * vec4( modifiedPosition, 1.0 );
    gl_Position = uMVPMatrix * vec4(modifiedPosition, 1.0);
}