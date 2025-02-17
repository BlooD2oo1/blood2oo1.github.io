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
        
	
    
    vec3 vCWater = mix( vec3(0.5, 0.7, 0.7), vec3(0.4, 0.6, 0.8)*0.7, smoothstep( 0.0, 0.009, vTexC.z ) )*0.7;
    vec3 vCLand = vec3(0.7, 0.6, 0.4) * 0.8;

    //vCWater = mix( vCWater, vec3(1.0), min( 1.0, length(vTexC.xy)*100.0 ) );
    vCWater = mix( vCWater, vec3(1.0), min( 1.0, length(vTexDt.xy)*length(vTexC.xy)*10.0 ) );

    outColor.rgb = mix(vCLand, vCWater, fWater );// + vec3( abs(vTexC.xy)*1.0,1), fWater);
   
    float fL = max(0.0, dot(vNormal, g_vLightDir));

    vec3 g_vCLight = vec3(1.0, 0.9, 0.7)*3.0;
    vec3 g_vCAmbient = mix( vCLand*0.1, vec3(0.3, 0.5, 0.7), vNormal.z*0.5+0.5 )*0.5;

    outColor.rgb *= g_vCLight*fL + g_vCAmbient;
    outColor.a = 1.0;
}