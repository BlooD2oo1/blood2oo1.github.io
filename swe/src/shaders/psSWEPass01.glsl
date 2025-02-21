#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
out vec4 outColor;

#GLOBALS

uniform vec2 uClickPosition;
uniform ivec2 uMouseButtons;



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
        fW = 0.5 - 0.5 * cos(fW*PI2);
        outColor.z += fW * 0.00003 * g_fElapsedTimeInSec;
    }

    {
        float fRad = 0.09;
        vec2 vDir = vTexCoord - vec2(0.85,0.7);
        float fDirLen = length(vDir);
        float fW = max(0.0, (fRad - fDirLen)/fRad );
        fW = 0.5 - 0.5 * cos(fW*PI2);
        outColor.z += fW * 0.000004 * g_fElapsedTimeInSec;
    }

    {
        float fRad = 0.09;
        vec2 vDir = vTexCoord - vec2(0.15,0.3);
        float fDirLen = length(vDir);
        float fW = max(0.0, (fRad - fDirLen)/fRad );
        fW = 0.5 - 0.5 * cos(fW*PI2);
        outColor.z -= fW * 0.000004 * g_fElapsedTimeInSec;
    }
}