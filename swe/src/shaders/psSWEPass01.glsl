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

uniform vec2 uMousePosition;
uniform ivec2 uMouseButtons;

// Velocity Advection

void main()
{
    ivec2 tc = ivec2(vTexCoord*uRTRes);
    vec4 vTexC = texelFetch(uTexture, tc, 0);

    float dt = -g_fAdvectSpeed * g_fElapsedTimeInSec / g_fGridSizeInMeter;
    vec2 v1 = vTexC.xy;
    vec2 v2 = textureLod(uTexture, vTexCoord - ( 0.5 * v1 * dt ) / uRTRes, 0.0 ).xy;
    vec2 v3 = textureLod(uTexture, vTexCoord - ( 0.5 * v2 * dt ) / uRTRes, 0.0 ).xy;
    vec2 v4 = textureLod(uTexture, vTexCoord - ( v3 * dt ) / uRTRes, 0.0 ).xy;
    vec2 v = (1.0 * v1 + 2.0 * v2 + 2.0 * v3 + 1.0 * v4) / 6.0;
    
    outColor = textureLod(uTexture, vTexCoord + ( v * dt ) / uRTRes, 0.0);
	outColor.zw = vTexC.zw;

    if ( uMouseButtons.x!=0)
    {
        outColor.z += max(0.0, 0.1 - length(vTexCoord - vec2(0.3))) * 0.05;
    }
}