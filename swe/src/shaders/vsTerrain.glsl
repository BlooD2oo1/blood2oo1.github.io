#version 300 es
precision highp float;

layout(location = 0) in vec3 position;
out vec2 vTexCoord;
out vec4 vShadowCoord;

uniform mat4 g_matVP;
uniform mat4 g_matVPShadow;
uniform sampler2D g_tTex;

void main() {
    float fZScale = 8.0;
    vTexCoord = position.xy;
    ivec2 tc = ivec2( vTexCoord * vec2( textureSize(g_tTex, 0) ) );
	vec4 vTexC = texelFetch(g_tTex, tc, 0);
    vec3 modifiedPosition = vec3(position.xy-vec2(0.5), (vTexC.w + vTexC.z)* fZScale); // Modify the z value with the texture sample
    vShadowCoord = g_matVPShadow * vec4( modifiedPosition, 1.0 );
    gl_Position = g_matVP * vec4(modifiedPosition, 1.0);
}