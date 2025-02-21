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

// Height Integration

void main()
{
    ivec2 tc = ivec2(vTexCoord * g_vRTRes);

    vec4 vTexC = texelFetch(g_tTex, tc, 0);
    vec4 vTexL = (tc.x > 0) ? texelFetchOffset(g_tTex, tc, 0, ivec2(-1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexR = (tc.x < int(g_vRTRes.x) - 1) ? texelFetchOffset(g_tTex, tc, 0, ivec2(1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexT = (tc.y > 0) ? texelFetchOffset(g_tTex, tc, 0, ivec2(0, -1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexB = (tc.y < int(g_vRTRes.y) - 1) ? texelFetchOffset(g_tTex, tc, 0, ivec2(0, 1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);

    vec2 vOffset = vTexC.xy / g_vRTRes.xy * g_fAdvectSpeed * g_fElapsedTimeInSec / g_fGridSizeInMeter;

    vec4 vTex = textureLod(g_tTex, vTexCoord + vOffset, 0.0);

    if (vTexC.x == 0.0) vTex.xyz = vTexC.xyz;
    if (vTexC.y == 0.0) vTex.xyz = vTexC.xyz;

    vTex.zw = vTexC.zw;

    float fxL = vTexL.x;
    float fxR = vTexC.x;
    float fyT = vTexT.y;
    float fyB = vTexC.y;

    // We also found that it yields a more stable simulation:
    float hL = (vTexL.x >= 0.0) ? vTexL.z : vTexC.z;
    float hR = (vTexC.x <= 0.0) ? vTexR.z : vTexC.z;
    float hT = (vTexT.y >= 0.0) ? vTexT.z : vTexC.z;
    float hB = (vTexC.y <= 0.0) ? vTexB.z : vTexC.z;

    {
        // 2.1.5. Stability Enhancements
        float beta = 2.0;
        float hAvgMax = beta * g_fGridSizeInMeter / ( g_fG * g_fElapsedTimeInSec );
        float hAdj = max( 0.0, (hR+hL+hB+hT)/4.0 - hAvgMax );
        //float hAdj = max( 0.0, (vTexL.z+vTexR.z+vTexT.z+vTexB.z)/4.0 - hAvgMax );

        hL -= hAdj;
        hR -= hAdj;
        hT -= hAdj;
        hB -= hAdj;
    }

    float dH = -((hR * fxR - hL * fxL) / g_fGridSizeInMeter + (hB * fyB - hT * fyT) / g_fGridSizeInMeter);

    vTexC.z += dH * (g_fElapsedTimeInSec);

    // 2.2. Overshooting Reduction
    {
        float hC = vTexC.z+vTexC.w;
        float hL = vTexL.z+vTexL.w;
        float hR = vTexR.z+vTexR.w;
        float hT = vTexT.z+vTexT.w;
        float hB = vTexB.z+vTexB.w;
        float lamdaedge = 2.0*g_fGridSizeInMeter;
        float alphaedge = 0.5;
        if ( ( ( hC - hL ) > lamdaedge ) && ( hC > hR ) )
        {
            vTexC.z += alphaedge * ( max( 0.0, (vTexC.z+vTexR.z)/2.0 ) - vTexC.z );
        }
        if ( ( ( hC - hR ) > lamdaedge ) && ( hC > hL ) )
        {
            vTexC.z += alphaedge * ( max( 0.0, (vTexC.z+vTexL.z)/2.0 ) - vTexC.z );
        }
        if ( ( ( hC - hT ) > lamdaedge ) && ( hC > hB ) )
        {
            vTexC.z += alphaedge * ( max( 0.0, (vTexC.z+vTexB.z)/2.0 ) - vTexC.z );
        }
        if ( ( ( hC - hB ) > lamdaedge ) && ( hC > hT ) )
        {
            vTexC.z += alphaedge * ( max( 0.0, (vTexC.z+vTexT.z)/2.0 ) - vTexC.z );
        }
    }

    if ( vTexC.z <= 0.0 )
    {
        vTexC.z = 0.0;
    }

    outColor = vTexC;
}