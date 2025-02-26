#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
layout(location = 0) out vec4 outColor0;
layout(location = 1) out vec4 outColor1;

#GLOBALS

uniform vec2 uClickPosition;
uniform ivec2 uMouseButtons;

// Velocity Advection

void main()
{
    ivec2 tc = ivec2(vTexCoord*g_vRTRes);
    vec4 vTexC = texelFetch(g_tTex1, tc, 0);
    vec4 vTexC2 = texelFetch(g_tTex2, tc, 0);

    float dt = g_fAdvectSpeed * g_fElapsedTimeInSec / g_fGridSizeInMeter;
    /*{
        vec2 v1 = vTexC.xy;
        vec2 v2 = textureLod(g_tTex1, vTexCoord - ( 0.5 * v1 * dt ) / g_vRTRes, 0.0 ).xy;
        vec2 v3 = textureLod(g_tTex1, vTexCoord - ( 0.5 * v2 * dt ) / g_vRTRes, 0.0 ).xy;
        vec2 v4 = textureLod(g_tTex1, vTexCoord - ( v3 * dt ) / g_vRTRes, 0.0 ).xy;
        vec2 v = (1.0 * v1 + 2.0 * v2 + 2.0 * v3 + 1.0 * v4) / 6.0;
    
        outColor0 = textureLod(g_tTex1, vTexCoord - ( v * dt ) / g_vRTRes, 0.0);
    }*/

    /*{
        vec2 velocity = vTexC.xy;
        // Compute backward position (semi-Lagrangian)
        vec2 prevPos = vTexCoord - velocity * dt / g_vRTRes;

        // Sample velocity at backward position
        vec4 vTexPrev = textureLod(g_tTex1, prevPos, 0.0);
        vec2 velocityPrev = vTexPrev.xy;

        // Predict forward position (MacCormack)
        vec2 forwardPos = prevPos + velocityPrev * dt / g_vRTRes;
        vec4 vTexForward = textureLod(g_tTex1, forwardPos, 0.0);
        vec2 velocityForward = vTexForward.xy;

        // Compute MacCormack correction
        vec2 velocityAdvected = (velocity + velocityForward) * 0.5;
        
        // Clamp to avoid overshoots
        // vec2 minVel = min(velocityPrev, velocityForward);
        // vec2 maxVel = max(velocityPrev, velocityForward);
        // 
        // if (any(lessThan(velocityAdvected, minVel)) || any(greaterThan(velocityAdvected, maxVel)))
        // {
        //     velocityAdvected = velocityPrev; // Fallback to semi-Lagrangian
        // }

        
        outColor0 = textureLod(g_tTex1, vTexCoord - velocityAdvected * dt / g_vRTRes, 0.0);

    }*/

    {
        //MacCormack
        vec2 v0 = vTexC.xy * dt / g_vRTRes;
		vec2 vk1 = textureLod(g_tTex1, vTexCoord + v0, 0.0).xy * dt / g_vRTRes;
        vec2 vk0 = ( v0 + vk1 ) * 0.5;
		outColor0 = textureLod(g_tTex1, vTexCoord + vk0, 0.0);
    }

    //outColor0.xy = vTexC.xy;
    outColor0.z = vTexC.z;
	outColor0.w = vTexC.w;

    //outColor0.x += noise( vTexCoord.xy*1.5 + vec2(float(g_iSWEFrameCount)*0.001))*0.001 / g_vRTRes.x;
    //outColor0.y += noise( vTexCoord.xy*1.5 + vec2(float(g_iSWEFrameCount+10)*0.001))*0.001 / g_vRTRes.y;

    if ( uMouseButtons.x!=0)
    {
        float fRad = 0.06;
        vec2 vDir = vTexCoord - uClickPosition;
        float fDirLen = length(vDir);
        float fW = max(0.0, (fRad - fDirLen)/fRad );
        fW = 0.5 - 0.5 * cos(fW*PI2);
        outColor0.z += fW * 0.00009 * g_fElapsedTimeInSec;
    }

    {
        float fRad = 0.09;
        vec2 vDir = vTexCoord - vec2(0.85,0.7);
        float fDirLen = length(vDir);
        float fW = max(0.0, (fRad - fDirLen)/fRad );
        fW = 0.5 - 0.5 * cos(fW*PI2);
        outColor0.z += fW * 0.000006 * g_fElapsedTimeInSec;
    }

    {
        float fRad = 0.09;
        vec2 vDir = vTexCoord - vec2(0.15,0.3);
        float fDirLen = length(vDir);
        float fW = max(0.0, (fRad - fDirLen)/fRad );
        fW = 0.5 - 0.5 * cos(fW*PI2);
        outColor0.z -= fW * 0.000006 * g_fElapsedTimeInSec;
    }

    outColor1 = vTexC2;
}