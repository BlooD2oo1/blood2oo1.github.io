uniform sampler2D g_tTex1;
uniform sampler2D g_tTex2;
uniform sampler2D g_tTexNorm;
uniform sampler2D g_tShadowMap;

uniform vec2 g_vRTRes;
uniform mat4 g_matVP;
uniform mat4 g_matVPInv;
uniform mat4 g_matVPShadow;
uniform vec3 g_vLightDir;
uniform vec3 g_vViewDir;

uniform float g_fGridSizeInMeter;
uniform float g_fElapsedTimeInSec;
uniform float g_fAdvectSpeed;
uniform float g_fAdvectDissipation;
uniform float g_fSandSlope;
uniform float g_fSandFlow;
uniform float g_fG;
uniform float g_fHackBlurDepth;
uniform int g_iInitSetting;
uniform int g_iSWEFrameCount;

uniform float g_fRndSeed;

#define EPS 0.00001


const float PI05 = 1.5707963267948966192313216916398;
const float PI = 3.1415926535897932384626433832795;
const float PI2 = 6.283185307179586476925286766559;
const float PIRECIP = 0.31830988618379067153776752674503;
const float PIPER180 = 0.01745329251994329576923690768489;
const float SQRT2 = 1.4142135623730950488016887242097;
const float E_NUMBER = 2.7182818284590452353602874713527;
const float LN2 = 0.69314718055994530941723212145817658;

const vec3 g_vCWaterShallow = vec3(0.3, 0.8, 0.8) * 0.4;
const vec3 g_vCWaterDeep = vec3(0.3, 0.6, 0.8) * 0.7 * 0.4;
const vec3 g_vCWaterMud = vec3(0.5, 0.4, 0.3) * 0.4;
const vec3 g_vCLandRock = vec3(0.65, 0.7, 0.75) * 0.2;
const vec3 g_vCLandSand = vec3(0.8, 0.7, 0.6) * 0.8;
const vec3 g_vCLight = vec3(1.0, 0.8, 0.5) * 8.0;
const vec3 g_vCAmbientUp = vec3(0.3, 0.5, 0.7) * 0.15;
const vec3 g_vCAmbientDown = (g_vCLandRock + g_vCLandSand) * 0.5 * 0.02;

vec2 hash(vec2 p) // replace this by something better
{
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(in vec2 p)
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;

    vec2  i = floor(p + (p.x + p.y) * K1);
    vec2  a = p - i + (i.x + i.y) * K2;
    float m = step(a.y, a.x);
    vec2  o = vec2(m, 1.0 - m);
    vec2  b = a - o + K2;
    vec2  c = a - 1.0 + 2.0 * K2;
    vec3  h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3  n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
    return dot(n, vec3(70.0));
}

vec3 hash3( vec2 p )
{
    vec3 q = vec3( dot(p,vec2(127.1,311.7)), 
				   dot(p,vec2(269.5,183.3)), 
				   dot(p,vec2(419.2,371.9)) );
	return fract(sin(q)*43758.5453);
}

float voronoise( in vec2 p, float u, float v )
{
	float k = 1.0+63.0*pow(1.0-v,6.0);

    vec2 i = floor(p);
    vec2 f = fract(p);
    
	vec2 a = vec2(0.0,0.0);
    for( int y=-2; y<=2; y++ )
    for( int x=-2; x<=2; x++ )
    {
        vec2  g = vec2( x, y );
		vec3  o = hash3( i + g )*vec3(u,u,1.0);
		vec2  d = g - f + o.xy;
		float w = pow( 1.0-smoothstep(0.0,1.414,length(d)), k );
		a += vec2(o.z*w,w);
    }
	
    return a.x/a.y;
}

float SampleDepth(vec2 xy)
{
    float fRet = 0.0;
    if ( g_iInitSetting == 0 )
    {
        vec2 vUV = xy * 5.0 * 0.001 + 7.0;
        vUV += vec2(noise(vUV + 2.0), noise(vUV + 1.0)) * 0.1;
        mat2 m = mat2(2.0, 1.2, -1.2, 2.0);
        fRet = noise(vUV) / 2.0; vUV = (m * vUV);
        fRet += noise(vUV) / 8.0; vUV = (m * vUV);
        vUV += vec2(noise(vUV + 0.5), noise(vUV + 2.5)) * 0.1;
        fRet += noise(vUV) / 16.0; vUV = (m * vUV);
        fRet += noise(vUV) / 64.0; vUV = (m * vUV);
        fRet += noise(vUV) / 128.0; vUV = (m * vUV);
        fRet += noise(vUV) / 256.0; vUV = (m * vUV);

        fRet *= 1.8;
        {
            vec2 p = vec2( 1.0, 0.44);
            p = p*p*(3.0-2.0*p);
	        p = p*p*(3.0-2.0*p);
	        p = p*p*(3.0-2.0*p);
            fRet += voronoise(xy*0.035, p.x, p.y) * 0.12;
        }

        {
            vec2 p = vec2( 1.0, 0.43);
            p = p*p*(3.0-2.0*p);
	        p = p*p*(3.0-2.0*p);
	        p = p*p*(3.0-2.0*p);
            fRet += voronoise(xy*0.12, p.x, p.y) * 0.04;
        }
        fRet += 0.2;

        fRet *= 0.01;

		fRet += xy.x*0.00005;
		fRet += xy.y*0.00005;

        //fRet = clamp(fRet, 0.0, 0.001);
        //fRet = ( 1.0-exp(-abs(fRet)/0.001))*0.001;// * sign(fRet);
        //fRet = ( 1.0-exp(-abs(fRet)/0.001))*0.001 * sign(fRet);

        //fRet = textureLod(m_tDepthMap, vec4( uv, 0, 0 )).r*0.04 * _MainTex_TexelSize.w-130.0;
        //fRet += pow(-cos(uv.x*PI2)*0.5+0.5, 0.5)*100.0-110.0;
        //fRet += ( 1.0-exp( -pow( abs(uv.y*2.0-1.0)*1.0, 4.0 )*5.0 ) ) * 35.0;
        //fRet += ( 1.0-exp( -pow( abs(uv.y*2.0-1.0+sin(uv.x*3.14*3.0+fNoise*0.5)*0.3)*1.5, 3.5 )*150.0 ) ) * 35.0;
        //fRet = mix( fRet, 1.8, -sminCubic( -smoothstep( 0.6, 0.72, abs(uv.x*2.0-1.0) ), -smoothstep( 0.6, 0.72, abs(uv.y*2.0-1.0) ), 1.0 ) );
        //fRet = mix( fRet, 0.0, -sminCubic( -smoothstep( 0.9, 0.98, abs(uv.x*2.0-1.0) ), -smoothstep( 0.9, 0.98, abs(uv.y*2.0-1.0) ), 1.0 ) );
        //fRet += pow( length( 1.0-(uv) ), 2.5 )*0.1+0.0;
    }
    else if ( g_iInitSetting == 1 )
    {
        vec2 vUV = xy * 5.0 * 0.0008 + 9.0;
        vUV += vec2(noise(vUV + 2.0), noise(vUV + 1.0)) * 0.1;
        mat2 m = mat2(2.0, 1.2, -1.2, 2.0);
        fRet = noise(vUV) / 2.0; vUV = (m * vUV);
        fRet += noise(vUV) / 8.0; vUV = (m * vUV);
        vUV += vec2(noise(vUV + 0.5), noise(vUV + 2.5)) * 0.1;
        fRet += noise(vUV) / 16.0; vUV = (m * vUV);
        fRet += noise(vUV) / 64.0; vUV = (m * vUV);
        fRet += noise(vUV) / 128.0; vUV = (m * vUV);
        fRet += noise(vUV) / 256.0; vUV = (m * vUV);

        fRet *= 8.0;
        //fRet = sin(fRet*2.7*4.0)*0.3;
        
        fRet = ( 1.0-exp(-abs(fRet)/0.9))*0.9 * sign(fRet);
        {
            vec2 p = vec2( 1.0, 0.44);
            p = p*p*(3.0-2.0*p);
	        p = p*p*(3.0-2.0*p);
	        p = p*p*(3.0-2.0*p);
            fRet += voronoise(xy*0.035, p.x, p.y) * 0.05;
        }
        
        {
            vec2 p = vec2( 1.0, 0.45);
            p = p*p*(3.0-2.0*p);
	        p = p*p*(3.0-2.0*p);
	        p = p*p*(3.0-2.0*p);
            fRet += voronoise(xy*0.12, p.x, p.y) * 0.02;
        }

        fRet += xy.x * 0.002;
        fRet += xy.y * 0.002;

        fRet += 0.0;

        fRet *= 0.025;

    }
    else if (g_iInitSetting == 2 )
    {
        vec2 vLQ = xy - vec2(1024.0 / 2.0);
        float fLQ = max( abs( vLQ.x ), abs( vLQ.y ) );
        //fRet = 0.00002 * length( vLQ );
		fRet += 0.001 * max( 0.0, fLQ-450.0 );
    }

    return fRet;
}

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

float BasicShadow(sampler2D shadowMap, vec3 shadowCoord)
{
	float shadowDepth = texture(shadowMap, shadowCoord.xy).r;
	return shadowCoord.z > shadowDepth + 0.004 ? 0.0 : 1.0;
}

vec2 PCFShadow(sampler2D shadowMap, vec3 shadowCoord, float fRadMul, vec2 vTexCoord)
{
    vec2 fShadow_fDist = vec2(0.0);
    float texelSize = 1.0 / float(textureSize(shadowMap, 0).x);
    texelSize *= fRadMul;

    // Generate a random rotation angle based on the texture coordinates
    float angle = random(vTexCoord) * 6.28318530718; // 2 * PI
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));

    for (int i = 0; i < 16; ++i) {
        vec2 offset = rotation * poissonDisk[i] * texelSize;
        float shadowDepth = texture(shadowMap, shadowCoord.xy + offset).r;
        fShadow_fDist.x += shadowCoord.z > shadowDepth + 0.004 * fRadMul ? 0.0 : 1.0;
        fShadow_fDist.y += shadowCoord.z - shadowDepth;
    }
    fShadow_fDist.x /= 16.0;
    fShadow_fDist.y /= 16.0;
    return fShadow_fDist;
}























/* discontinuous pseudorandom uniformly distributed in [-0.5, +0.5]^3 */
vec3 random3(vec3 c) {
	float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
	vec3 r;
	r.z = fract(512.0*j);
	j *= .125;
	r.x = fract(512.0*j);
	j *= .125;
	r.y = fract(512.0*j);
	return r-0.5;
}

/* skew constants for 3d simplex functions */
const float F3 =  0.3333333;
const float G3 =  0.1666667;

/* 3d simplex noise */
float simplex3d(vec3 p) {
	 /* 1. find current tetrahedron T and it's four vertices */
	 /* s, s+i1, s+i2, s+1.0 - absolute skewed (integer) coordinates of T vertices */
	 /* x, x1, x2, x3 - unskewed coordinates of p relative to each of T vertices*/
	 
	 /* calculate s and x */
	 vec3 s = floor(p + dot(p, vec3(F3)));
	 vec3 x = p - s + dot(s, vec3(G3));
	 
	 /* calculate i1 and i2 */
	 vec3 e = step(vec3(0.0), x - x.yzx);
	 vec3 i1 = e*(1.0 - e.zxy);
	 vec3 i2 = 1.0 - e.zxy*(1.0 - e);
	 	
	 /* x1, x2, x3 */
	 vec3 x1 = x - i1 + G3;
	 vec3 x2 = x - i2 + 2.0*G3;
	 vec3 x3 = x - 1.0 + 3.0*G3;
	 
	 /* 2. find four surflets and store them in d */
	 vec4 w, d;
	 
	 /* calculate surflet weights */
	 w.x = dot(x, x);
	 w.y = dot(x1, x1);
	 w.z = dot(x2, x2);
	 w.w = dot(x3, x3);
	 
	 /* w fades from 0.6 at the center of the surflet to 0.0 at the margin */
	 w = max(0.6 - w, 0.0);
	 
	 /* calculate surflet components */
	 d.x = dot(random3(s), x);
	 d.y = dot(random3(s + i1), x1);
	 d.z = dot(random3(s + i2), x2);
	 d.w = dot(random3(s + 1.0), x3);
	 
	 /* multiply d by w^4 */
	 w *= w;
	 w *= w;
	 d *= w;
	 
	 /* 3. return the sum of the four surflets */
	 return dot(d, vec4(52.0));
}

/* const matrices for 3d rotation */
const mat3 rot1 = mat3(-0.37, 0.36, 0.85,-0.14,-0.93, 0.34,0.92, 0.01,0.4);
const mat3 rot2 = mat3(-0.55,-0.39, 0.74, 0.33,-0.91,-0.24,0.77, 0.12,0.63);
const mat3 rot3 = mat3(-0.71, 0.52,-0.47,-0.08,-0.72,-0.68,-0.7,-0.45,0.56);

/* directional artifacts can be reduced by rotating each octave */
float simplex3d_fractal(vec3 m) {
    return   0.5333333*simplex3d(m*rot1)
			+0.2666667*simplex3d(2.0*m*rot2)
			+0.1333333*simplex3d(4.0*m*rot3)
			+0.0666667*simplex3d(8.0*m);
}