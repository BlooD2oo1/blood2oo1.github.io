#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uTexture;
uniform sampler2D uTexNorm;
uniform vec2 uRTRes;
uniform mat4 uMVPMatrix;
uniform vec3 g_vLightDir;

uniform float g_fGridSizeInMeter;
uniform float g_fElapsedTimeInSec;
uniform float g_fAdvectSpeed;
uniform float g_fG;
uniform float g_fHackBlurDepth;

void main() {
    vec4 vTexC = texture(uTexture, vTexCoord);
    vec4 vTexDt = texture(uTexNorm, vTexCoord + vec2(0.5)/uRTRes);
	float fWater = smoothstep( 0.0, 0.001, vTexC.z );

    vec3 vNormal = normalize( vec3( vTexDt.xy, g_fGridSizeInMeter ) );
        
    //vec3 vLightDir = normalize(vec3(uMVPMatrix[0].xy, 0.3));

	outColor.a = 1.0;
    //outColor.rgb = vec3(fWater*0.8+0.2);
    outColor.rgb = mix(vec3(0.9, 0.8, 0.4), vec3(0.7, 0.9, 1.0)+vec3( abs(vTexC.xy)*10.0,1), fWater);
    //outColor.rg = vTexNorm.rg*vec2(0.5)+vec2(0.5);

    //basic shading with vLightDir:
    float fL = max(0.0, dot(vNormal, g_vLightDir));
    //float fL = dot(vNormal, g_vLightDir)*0.5+0.5;
    //fL = mix( smoothstep( 0.48, 0.52, fL ), fL, 0.5 );
    outColor.rgb *= fL*3.0;

}