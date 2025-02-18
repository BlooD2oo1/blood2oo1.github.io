#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D uTexture;
uniform vec2 uRTRes;
uniform float g_fGridSizeInMeter;
uniform float g_fElapsedTimeInSec;
uniform float g_fAdvectSpeed;
uniform float g_fG;
uniform float g_fHackBlurDepth;

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
    vec2 vUV = xy * g_fGridSizeInMeter * 0.0005 + 3.0;
    vUV += vec2(noise(vUV + 2.0), noise(vUV + 1.0)) * 0.1;
    mat2 m = mat2(2.0, 1.2, -1.2, 2.0);
    fRet = noise(vUV) / 2.0; vUV = (m * vUV);
    fRet += noise(vUV) / 8.0; vUV = (m * vUV);
    vUV += vec2(noise(vUV + 0.5), noise(vUV + 2.5)) * 0.1;
    fRet += noise(vUV) / 16.0; vUV = (m * vUV);
    fRet += noise(vUV) / 64.0; vUV = (m * vUV);
    fRet += noise(vUV) / 128.0; vUV = (m * vUV);
    fRet += noise(vUV) / 256.0; vUV = (m * vUV);

    fRet *= 1.6;
    vec2 p = vec2( 1.0, 0.44);
    p = p*p*(3.0-2.0*p);
	p = p*p*(3.0-2.0*p);
	p = p*p*(3.0-2.0*p);
    fRet += voronoise(xy*0.015, p.x, p.y) * 0.3;
    fRet -= 0.1;

    float fNoise = fRet;
    

    fRet = fNoise * 0.01;

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

    return fRet * g_fGridSizeInMeter;
}

void main()
{
	//outColor = vec4( fract( vTexCoord*8.0 ), 0.0, 1.0);
	outColor = vec4(0);
    ivec2 tc = ivec2(vTexCoord * uRTRes);
	outColor.w = SampleDepth(vec2(tc));
	outColor.z = max(0.0, -outColor.w);
}