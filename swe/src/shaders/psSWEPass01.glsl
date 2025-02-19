#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D g_tTex;
uniform vec2 g_vRTRes;
uniform float g_fGridSizeInMeter;
uniform float g_fElapsedTimeInSec;
uniform float g_fAdvectSpeed;
uniform float g_fG;
uniform float g_fHackBlurDepth;

uniform vec2 uClickPosition;
uniform ivec2 uMouseButtons;

const float PI05 = 1.5707963267948966192313216916398;
const float PI = 3.1415926535897932384626433832795;
const float PI2 = 6.283185307179586476925286766559;
const float PIRECIP = 0.31830988618379067153776752674503;
const float PIPER180 = 0.01745329251994329576923690768489;
const float SQRT2 = 1.4142135623730950488016887242097;
const float E_NUMBER = 2.7182818284590452353602874713527;
const float LN2 = 0.69314718055994530941723212145817658;

// Velocity Advection

void main()
{
    ivec2 tc = ivec2(vTexCoord*g_vRTRes);
    vec4 vTexC = texelFetch(g_tTex, tc, 0);

    float dt = -g_fAdvectSpeed * g_fElapsedTimeInSec / g_fGridSizeInMeter;
    vec2 v1 = vTexC.xy;
    vec2 v2 = textureLod(g_tTex, vTexCoord - ( 0.5 * v1 * dt ) / g_vRTRes, 0.0 ).xy;
    vec2 v3 = textureLod(g_tTex, vTexCoord - ( 0.5 * v2 * dt ) / g_vRTRes, 0.0 ).xy;
    vec2 v4 = textureLod(g_tTex, vTexCoord - ( v3 * dt ) / g_vRTRes, 0.0 ).xy;
    vec2 v = (1.0 * v1 + 2.0 * v2 + 2.0 * v3 + 1.0 * v4) / 6.0;
    
    outColor = textureLod(g_tTex, vTexCoord + ( v * dt ) / g_vRTRes, 0.0);
	outColor.zw = vTexC.zw;

    if ( uMouseButtons.x!=0)
    {
        float fRad = 0.09;
        vec2 vDir = vTexCoord - uClickPosition;
        float fDirLen = length(vDir);
        float fW = max(0.0, (fRad - fDirLen)/fRad );
        //fW = 0.5 - 0.5 * cos(fW*PI);
        fW = 0.5 - 0.5 * cos(fW*PI2);
        outColor.z += fW * 0.000004 * g_fElapsedTimeInSec;
        //vDir.xy = vec2( vDir.y, -vDir.x );
        //outColor.xy += fW * 0.001 * vDir/fDirLen;
    }

    {
        float fRad = 0.09;
        vec2 vDir = vTexCoord - vec2(0.85,0.7);
        float fDirLen = length(vDir);
        float fW = max(0.0, (fRad - fDirLen)/fRad );
        fW = 0.5 - 0.5 * cos(fW*PI2);
        outColor.z += fW * 0.0000005 * g_fElapsedTimeInSec;
    }

    {
        float fRad = 0.09;
        vec2 vDir = vTexCoord - vec2(0.15,0.5);
        float fDirLen = length(vDir);
        float fW = max(0.0, (fRad - fDirLen)/fRad );
        fW = 0.5 - 0.5 * cos(fW*PI2);
        outColor.z -= fW * 0.0000005 * g_fElapsedTimeInSec;
    }
}