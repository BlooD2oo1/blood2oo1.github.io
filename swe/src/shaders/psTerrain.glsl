#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec4 vShadowCoord;
out vec4 outColor;

uniform sampler2D uTexture;
uniform sampler2D uTexNorm;
uniform sampler2D uShadowMap;
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
    vec3 ambient = mix(vAmbientColorDown, vAmbientColorUp, upFactor) * vDiffuse;

    // Final shading result
    return ambient + (diffuse + specular) * vLightColor * NoL;
}

const vec2 poissonDisk[16] = vec2[](
    vec2(-0.94201624, -0.39906216),
    vec2(0.94558609, -0.76890725),
    vec2(-0.094184101, -0.92938870),
    vec2(0.34495938, 0.29387760),
    vec2(-0.91588581, 0.45771432),
    vec2(-0.81544232, -0.87912464),
    vec2(-0.38277543, 0.27676845),
    vec2(0.97484398, 0.75648379),
    vec2(0.44323325, -0.97511554),
    vec2(0.53742981, -0.47373420),
    vec2(-0.26496911, -0.41893023),
    vec2(0.79197514, 0.19090188),
    vec2(-0.24188840, 0.99706507),
    vec2(-0.81409955, 0.91437590),
    vec2(0.19984126, 0.78641367),
    vec2(0.14383161, -0.14100790)
    );

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float PCFShadow(sampler2D shadowMap, vec4 shadowCoord, float fRadMul) {
    float shadow = 0.0;
    float texelSize = 1.0 / float(textureSize(shadowMap, 0).x);
    texelSize *= fRadMul;

    // Generate a random rotation angle based on the texture coordinates
    float angle = random(vTexCoord) * 6.28318530718; // 2 * PI
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));

    for (int i = 0; i < 16; ++i) {
        vec2 offset = rotation * poissonDisk[i] * texelSize;
        float shadowDepth = texture(shadowMap, shadowCoord.xy + offset).r;
        shadow += shadowCoord.z > shadowDepth + 0.003 * fRadMul ? 0.0 : 1.0;
    }
    shadow /= 16.0;
    return shadow;
}

void main()
{
    float fZScale = 8.0;
    // Calculate shadow coordinates
    vec4 shadowCoord = vShadowCoord;
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.xyz = shadowCoord.xyz * 0.5 + 0.5;

    vec4 vTexC = texture(uTexture, vTexCoord);
    vec4 vTexDtC = texture(uTexNorm, vTexCoord + vec2(0.5)/uRTRes);
    vec4 vTexDtR = texture(uTexNorm, vTexCoord + vec2(0.5)/uRTRes + vec2(1.0/uRTRes.x,0.0));
    vec4 vTexDtB = texture(uTexNorm, vTexCoord + vec2(0.5)/uRTRes + vec2(0.0,1.0/uRTRes.y));

    // Calculate occlusion
    vec2 dC = vTexDtC.xy;
    vec2 dR = vTexDtR.xy;
    vec2 dB = vTexDtB.xy;

    float fOcc = pow( 1.0 - clamp(length(dC - dR) + length(dC - dB), 0.0, 1.0), 1.0 );
    fOcc *= pow( fOcc, 2.3 );
    
    float fWater = smoothstep( 0.0, 0.0015, vTexC.z );
    float fFoam = length(vTexDtC.xy) * length(vTexC.xy) * 10.0 / clamp(0.001, 1.0, vTexC.z * 1000.0);
	fFoam += smoothstep(0.0010, 0.0002, vTexC.z);//part
	fFoam = clamp(fFoam, 0.0, 1.0);
    vec3 vNormal = normalize( vec3( -vTexDtC.xy, g_fGridSizeInMeter/fZScale ) );
    
    vec3 vCWater = mix( vec3(0.3, 0.7, 0.7), vec3(0.3, 0.6, 0.8)*0.7, smoothstep( 0.0, 0.005, vTexC.z ) )*0.4;
	vec3 vCFoam = vec3(1.0);
    vec3 vCLand = vec3(0.6, 0.5, 0.3) * 0.6;

    vCWater = mix( vCWater, vCFoam, fFoam );

    vec3 vDiffuse = mix(vCLand, vCWater, fWater );
   
    vec3 g_vCLight = vec3(1.0, 0.8, 0.5) * 7.0;
    vec3 g_vCAmbientUp = vec3(0.3, 0.5, 0.7) * 0.15;
    vec3 g_vCAmbientDown = vCLand * 0.01;

    // Apply PCF shadow filtering
    float shadow = PCFShadow(uShadowMap, shadowCoord, mix( 1.0, 2.0, fWater ) );
    vec3 vColor = Shade(g_vLightDir, g_vCLight*shadow, g_vCAmbientUp * fOcc, g_vCAmbientDown * fOcc, vNormal, vDiffuse, mix( 0.9, 0.4, fWater ), mix(0.04, 0.1, fWater), g_vViewDir);

    outColor.rgb = vColor;
    outColor.a = 1.0;
    //outColor.rgb = vec3(fOcc);

    outColor.rgb = max(outColor.rgb, 0.0);
    outColor.rgb = 1.0 - exp(-outColor.rgb);
    outColor.rgb = pow(outColor.rgb, vec3(0.454545));
}
