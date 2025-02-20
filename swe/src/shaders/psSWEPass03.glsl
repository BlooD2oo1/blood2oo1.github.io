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

const float PI05 = 1.5707963267948966192313216916398;
const float PI = 3.1415926535897932384626433832795;
const float PI2 = 6.283185307179586476925286766559;
const float PIRECIP = 0.31830988618379067153776752674503;
const float PIPER180 = 0.01745329251994329576923690768489;
const float SQRT2 = 1.4142135623730950488016887242097;
const float E_NUMBER = 2.7182818284590452353602874713527;
const float LN2 = 0.69314718055994530941723212145817658;

// Height Integration

void main()
{
    ivec2 tc = ivec2(vTexCoord * g_vRTRes);

    vec4 vTexC = texelFetch(g_tTex, tc, 0);
    //vec4 vTexL = ( tc.x > 0 ) ?                    texelFetchOffset(iChannel0,tc, 0, ivec2(-1,0)) : vTexC*vec4(0.0,0.0,1.0,1.0);
    vec4 vTexR = (tc.x < int(g_vRTRes.x) - 1) ? texelFetchOffset(g_tTex, tc, 0, ivec2(1, 0)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);
    //vec4 vTexT = ( tc.y > 0 ) ?                    texelFetchOffset(iChannel0,tc, 0, ivec2(0,-1)) : vTexC*vec4(0.0,0.0,1.0,1.0);
    vec4 vTexB = (tc.y < int(g_vRTRes.y) - 1) ? texelFetchOffset(g_tTex, tc, 0, ivec2(0, 1)) : vTexC * vec4(0.0, 0.0, 1.0, 1.0);


    ////////////////////////////////////////////////////////////////


    float zC = vTexC.z + vTexC.w;
    //float zL = vTexL.z+vTexL.w;
    float zR = vTexR.z + vTexR.w;
    //float zT = vTexT.z+vTexT.w;
    float zB = vTexB.z + vTexB.w;

    vec2 vV;
    vV.x = -g_fG / g_fGridSizeInMeter * (zR - zC);
    vV.y = -g_fG / g_fGridSizeInMeter * (zB - zC);
    vTexC.xy += vV * g_fElapsedTimeInSec;

    // 2.1.4. Boundary Conditions

    const float EPS = 0.0001;
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
        l = min(l, g_fGridSizeInMeter / (g_fElapsedTimeInSec)*alpha);
        vTexC.xy *= l;
    }

    // hack blur
    /*{
        float fMinH = min( min( min( zL, zR ), min( zT, zB ) ), zC );
        float fMaxH = max( max( max( zL, zR ), max( zT, zB ) ), zC );
        float fW = clamp( ( fMaxH - fMinH )*g_fGridSizeInMeter/g_fHackBlurDepth, 0.0, 1.0 );

        float fTexLW = min( (zL-zC)*(1.0/4.0), vTexL.z );
        float fTexRW = min( (zR-zC)*(1.0/4.0), vTexR.z );
        float fTexTW = min( (zT-zC)*(1.0/4.0), vTexT.z );
        float fTexBW = min( (zB-zC)*(1.0/4.0), vTexB.z );

        float fTexAddition = fTexLW + fTexRW + fTexTW + fTexBW;
        vTexC.z += fTexAddition*0.99*fW;
    }*/

    // 2.1.5. Stability Enhancements
    if (vTexC.z <= 0.0)
    {
        vTexC.z = 0.0;
    }

    ////////////////////////////////////////////////////////////////


    //vTexC.w = SampleDepth(iChannel1, vTexCoord, iResolution.xy);

    // click
    /*if (iMouse.z > 0.0)
    {
        float l = length((fragCoord - iMouse.xy) * 0.001);
        l *= 20.0;
        l = clamp(1.0 - l, 0.0, 1.0);
        vTexC.z += 0.01 * (cos(l * PI) * -0.5 + 0.5);
    }*/

    // reset
    /*if ((iFrame <= 1) || (iMouse.z > 0.0 && iMouse.x < 40.0 && iMouse.y < 40.0))
    {
        vTexC.xy = vec2(0.0);

        vTexC.z = max(0.0 - vTexC.w, 0.0);

        // jon a cunami.
        float l = abs(uv.x - 0.95);
        l *= 10.0;
        l = clamp(1.0 - l, 0.0, 1.0);
        vTexC.z += 0.1 * (cos(l * PI) * -0.5 + 0.5);
    }*/

    // jon a cunami.
    /*float ll = length(vTexCoord);
    ll *= 20.0;
    ll = clamp(1.0 - ll, 0.0, 1.0);
    vTexC.z += 0.001 * (cos(ll * PI) * -0.5 + 0.5);// * sin(iTime * 1.6) * max(0.0, (10.0 - iTime) / 10.0);
    */

    outColor = vTexC;
}