#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
out vec4 outColor;

#GLOBALS

// Velocity Integration

void main()
{
    ivec2 tc = ivec2(vTexCoord * g_vRTRes);

    vec4 vTexC = texelFetch(g_tTex1, tc, 0);
    vec4 vTexL = ( tc.x > 0 ) ?                    texelFetchOffset(g_tTex1,tc, 0, ivec2(-1,0)) : vTexC*vec4(0.0,0.0,1.0,1.0);
    vec4 vTexR = (tc.x < int(g_vRTRes.x) - 1) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    vec4 vTexT = ( tc.y > 0 ) ?                    texelFetchOffset(g_tTex1,tc, 0, ivec2(0,-1)) : vTexC*vec4(0.0,0.0,1.0,1.0);
    vec4 vTexB = (tc.y < int(g_vRTRes.y) - 1) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(0, 1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);


    ////////////////////////////////////////////////////////////////


    float zC = vTexC.z + vTexC.w;
    float zL = vTexL.z + vTexL.w;
    float zR = vTexR.z + vTexR.w;
    float zT = vTexT.z + vTexT.w;
    float zB = vTexB.z + vTexB.w;

    vec2 vV;
    vV.x = -g_fG / g_fGridSizeInMeter * (zR - zC);
    vV.y = -g_fG / g_fGridSizeInMeter * (zB - zC);
    vTexC.xy += vV * g_fElapsedTimeInSec;

    // 2.1.4. Boundary Conditions

    if (((vTexC.z <= EPS * g_fGridSizeInMeter) && (vTexC.w > zR)) ||
        ((vTexR.z <= EPS * g_fGridSizeInMeter) && (vTexR.w > zC)))
    {
        vTexC.x = 0.0;
    }

    if (((vTexC.z <= EPS * g_fGridSizeInMeter) && (vTexC.w > zB)) ||
        ((vTexB.z <= EPS * g_fGridSizeInMeter) && (vTexB.w > zC)))
    {
        vTexC.y = 0.0;
    }

    // We also clamp the magnitudes
    float l = length(vTexC.xy);
    if (l > 0.0)
    {
        float alpha = 0.5;
        vTexC.xy /= l;
        l = min(l, alpha * g_fGridSizeInMeter / g_fElapsedTimeInSec);
        vTexC.xy *= l;
    }

    // hack blur
    /*{
        float fMinH = min( min( min( zL, zR ), min( zT, zB ) ), zC );
        float fMaxH = max( max( max( zL, zR ), max( zT, zB ) ), zC );
        //float fW = clamp( ( fMaxH - fMinH )*g_fGridSizeInMeter/g_fHackBlurDepth, 0.0, 1.0 );
        float fW = smoothstep( 0.5, 1.0, ( fMaxH - fMinH )*10.0 );

        float fTexLW = min( (zL-zC)*(1.0/4.0), vTexL.z );
        float fTexRW = min( (zR-zC)*(1.0/4.0), vTexR.z );
        float fTexTW = min( (zT-zC)*(1.0/4.0), vTexT.z );
        float fTexBW = min( (zB-zC)*(1.0/4.0), vTexB.z );

        float fTexAddition = fTexLW + fTexRW + fTexTW + fTexBW;
        vTexC.z += fTexAddition*0.2499*fW;
    }*/

    // 2.1.5. Stability Enhancements
    if (vTexC.z <= 0.0)
    {
        vTexC.z = 0.0;
    }

    outColor = vTexC;
}