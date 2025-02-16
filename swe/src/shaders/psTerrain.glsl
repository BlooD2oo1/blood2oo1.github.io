#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uTexture;

void main() {
    vec4 vTexC = texture(uTexture, vTexCoord);
	float fWater = smoothstep( 0.0, 0.01, vTexC.z );
    
	outColor.a = 1.0;
    outColor.rgb = vec3( fWater );
}