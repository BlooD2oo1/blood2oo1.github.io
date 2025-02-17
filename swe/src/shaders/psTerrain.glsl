#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uTexture;
uniform sampler2D uTexNorm;
uniform vec2 uRTRes;
uniform mat4 uMVPMatrix;
uniform vec3 g_vLightDir;
uniform vec3 g_vViewDir;

uniform float g_fGridSizeInMeter;
uniform float g_fElapsedTimeInSec;
uniform float g_fAdvectSpeed;
uniform float g_fG;
uniform float g_fHackBlurDepth;

vec3 Shade(vec3 vLightDir, vec3 vLightColor, vec3 vAmbientColorUp, vec3 vAmbientColorDown, vec3 vNormal, vec3 vDiffuse, float fRoughness, float fReflectance, vec3 vViewDir)
{
    /*// Normalize the normal and light direction
    vNormal = normalize(vNormal);
    vLightDir = normalize(vLightDir);

    // Calculate the ambient lighting
    vec3 vAmbient = mix(vAmbientColorDown, vAmbientColorUp, vNormal.z * 0.5 + 0.5);

    // Calculate the diffuse lighting
    float fDiffuse = max(dot(vNormal, vLightDir), 0.0);
    vec3 vDiffuseLight = fDiffuse * vLightColor * vDiffuse;

    // Calculate the specular lighting using the Cook-Torrance model
    vec3 vHalfDir = normalize(vLightDir + vViewDir);
    float fNdotH = max(dot(vNormal, vHalfDir), 0.0);
    float fNdotV = max(dot(vNormal, vViewDir), 0.0);
    float fNdotL = fDiffuse;
    float fVdotH = max(dot(vViewDir, vHalfDir), 0.0);

    float fD = pow(fNdotH, 2.0 * fRoughness) / (3.14159265359 * pow(fNdotH * fNdotH * (fRoughness - 1.0) + 1.0, 2.0));
    float fG = min(1.0, min(2.0 * fNdotH * fNdotV / fVdotH, 2.0 * fNdotH * fNdotL / fVdotH));
    vec3 vF = mix(vec3(fReflectance), vLightColor, pow(1.0 - fVdotH, 5.0));

    vec3 vSpecular = (fD * fG * vF) / (4.0 * fNdotV * fNdotL + 0.001);

    // Combine the ambient, diffuse, and specular components
    vec3 vColor = vAmbient + vDiffuseLight + vSpecular;

    return vColor;*/

    // Normálizálás
    vNormal = normalize(vNormal);
    vLightDir = normalize(vLightDir);
    vViewDir = normalize(vViewDir);

    // Félig középvektor (half-vector)
    vec3 H = normalize(vViewDir + vLightDir);

    // Dot product-ek
    float NoL = max(dot(vNormal, vLightDir), 0.0);
    float NoV = max(dot(vNormal, vViewDir), 0.0);
    float NoH = max(dot(vNormal, H), 0.0);
    float VoH = max(dot(vViewDir, H), 0.0);

    // GGX Normal Distribution Function (NDF)
    float a = fRoughness * fRoughness;
    float a2 = a * a;
    float denom = (NoH * NoH * (a2 - 1.0) + 1.0);
    float D = a2 / (3.14159265 * denom * denom);

    // Schlick's Fresnel Approximation
    vec3 F0 = mix(vec3(0.04), vDiffuse, fReflectance);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0);

    // Smith Geometry Function (Schlick-GGX)
    float k = (fRoughness + 1.0);
    k = (k * k) / 8.0;
    float G1V = NoV / (NoV * (1.0 - k) + k);
    float G1L = NoL / (NoL * (1.0 - k) + k);
    float G = G1V * G1L;

    // Cook-Torrance Specular BRDF
    vec3 specular = (D * F * G) / max(4.0 * NoV * NoL, 0.001);

    // Lambert Diffuse
    vec3 diffuse = vDiffuse / 3.14159265;

    // Ambient lighting (up-down blend)
    float upFactor = clamp(vNormal.z * 0.5 + 0.5, 0.0, 1.0);
    vec3 ambient = mix(vAmbientColorDown, vAmbientColorUp, upFactor);

    // Final shading result
    return ambient + (diffuse + specular) * vLightColor * NoL;
}

void main()
{
    vec4 vTexC = texture(uTexture, vTexCoord);
    vec4 vTexDt = texture(uTexNorm, vTexCoord + vec2(0.5)/uRTRes);
    float fWater = smoothstep( 0.0, 0.003, vTexC.z );

    vec3 vNormal = normalize( vec3( vTexDt.xy, g_fGridSizeInMeter ) );
    
    vec3 vCWater = mix( vec3(0.3, 0.7, 0.7), vec3(0.3, 0.5, 0.8)*0.7, smoothstep( 0.0, 0.05, vTexC.z ) )*0.4;
    vec3 vCLand = vec3(0.6, 0.5, 0.3) * 0.8;

    //vCWater = mix( vCWater, vec3(1.0), min( 1.0, length(vTexDt.xy)*length(vTexC.xy)*10.0 ) );

    vec3 vDiffuse = mix(vCLand, vCWater, fWater );
   
    vec3 g_vCLight = vec3(1.0, 0.8, 0.5) * 3.0;
    vec3 g_vCAmbientUp = vec3(0.3, 0.5, 0.7) * 0.1;
    vec3 g_vCAmbientDown = vCLand * 0.01;

    //vDiffuse = vec3( 0.1 );

    vec3 vColor = Shade(g_vLightDir, g_vCLight, g_vCAmbientUp, g_vCAmbientDown, vNormal, vDiffuse, mix( 0.8, 0.1, fWater ), mix(0.04, 0.5, fWater), g_vViewDir);

    outColor.rgb = vColor;
    outColor.a = 1.0;


    outColor.rgb = max(outColor.rgb, 0.0);
    outColor.rgb = 1.0 - exp(-outColor.rgb);
    outColor.rgb = pow(outColor.rgb, vec3(0.454545));
}
