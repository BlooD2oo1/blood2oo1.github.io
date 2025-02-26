#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
out vec4 outColor;

#GLOBALS

// Height Integration

void main()
{
    ivec2 tc = ivec2(vTexCoord * g_vRTRes);

    vec4 vTexC = texelFetch(g_tTex1, tc, 0);
    vec4 vTexL = (tc.x > 0) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(-1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexR = (tc.x < int(g_vRTRes.x) - 1) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexT = (tc.y > 0) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(0, -1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexB = (tc.y < int(g_vRTRes.y) - 1) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(0, 1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);

    //vec2 vOffset = vTexC.xy / g_vRTRes.xy * g_fAdvectSpeed * g_fElapsedTimeInSec / g_fGridSizeInMeter;
    //vec4 vTex = textureLod(g_tTex1, vTexCoord + vOffset, 0.0);
    //if (vTexC.x == 0.0) vTex.xyz = vTexC.xyz;
    //if (vTexC.y == 0.0) vTex.xyz = vTexC.xyz;
    //vTex.zw = vTexC.zw;

    float fVel_x_L = vTexL.x;
    float fVel_x_R = vTexC.x;
    float fVel_y_T = vTexT.y;
    float fVel_y_B = vTexC.y;

    // szerintem az elso naiv megoldas latvanyosabb ha eros a velocity advection ( nem annyira alakulnak ki a zavaro V-alakok ), de nem annyira stabil, rezonal neha
#if 1
    //basic:
    float hL = ( vTexL.z + vTexC.z ) * 0.5;
    float hR = ( vTexR.z + vTexC.z ) * 0.5;
    float hT = ( vTexT.z + vTexC.z ) * 0.5;
    float hB = ( vTexB.z + vTexC.z ) * 0.5;
#else
    // We also found that it yields a more stable simulation:
    float hL = (vTexL.x >= 0.0) ? vTexL.z : vTexC.z;
    float hR = (vTexC.x <= 0.0) ? vTexR.z : vTexC.z;
    float hT = (vTexT.y >= 0.0) ? vTexT.z : vTexC.z;
    float hB = (vTexC.y <= 0.0) ? vTexB.z : vTexC.z;
#endif

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

    float dH = -((hR * fVel_x_R - hL * fVel_x_L) / g_fGridSizeInMeter + (hB * fVel_y_B - hT * fVel_y_T) / g_fGridSizeInMeter);

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