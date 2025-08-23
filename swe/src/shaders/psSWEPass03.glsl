#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
layout(location = 0) out vec4 outColor0;
layout(location = 1) out vec4 outColor1;

#GLOBALS

//	tex1:
//		x: velocity x+1/2
//		y: velocity y+1/2
//		z: water depth
//		w: -
//	tex2:
//		x: rock depth
//		y: sand depth
//		z: -
//		w: -

// Velocity Integration

void main()
{
	ivec2 tc = ivec2(vTexCoord * g_vRTRes);

	vec4 vTex1C = texelFetch(g_tTex1, tc, 0);
	vec4 vTex1L = (tc.x > 0)					? texelFetchOffset(g_tTex1, tc, 0, ivec2(-1, 0))	: vTex1C * vec4(0.0, 0.0, 1.0, 1.0);
	vec4 vTex1R = (tc.x < int(g_vRTRes.x) - 1)	? texelFetchOffset(g_tTex1, tc, 0, ivec2(1, 0))		: vTex1C * vec4(0.0, 0.0, 1.0, 1.0);
	vec4 vTex1T = (tc.y > 0)					? texelFetchOffset(g_tTex1, tc, 0, ivec2(0, -1))	: vTex1C * vec4(0.0, 0.0, 1.0, 1.0);
	vec4 vTex1B = (tc.y < int(g_vRTRes.y) - 1)	? texelFetchOffset(g_tTex1, tc, 0, ivec2(0, 1))		: vTex1C * vec4(0.0, 0.0, 1.0, 1.0);

	vec4 vTex2C = texelFetch(g_tTex2, tc, 0);
	vec4 vTex2L = (tc.x > 0)					? texelFetchOffset(g_tTex2, tc, 0, ivec2(-1, 0))	: vTex2C * vec4(1.0, 1.0, 1.0, 1.0);
	vec4 vTex2R = (tc.x < int(g_vRTRes.x) - 1)	? texelFetchOffset(g_tTex2, tc, 0, ivec2(1, 0))		: vTex2C * vec4(1.0, 1.0, 1.0, 1.0);
	vec4 vTex2T = (tc.y > 0)					? texelFetchOffset(g_tTex2, tc, 0, ivec2(0, -1))	: vTex2C * vec4(1.0, 1.0, 1.0, 1.0);
	vec4 vTex2B = (tc.y < int(g_vRTRes.y) - 1)	? texelFetchOffset(g_tTex2, tc, 0, ivec2(0, 1))		: vTex2C * vec4(1.0, 1.0, 1.0, 1.0);

	////////////////////////////////////////////////////////////////

	float hC = vTex1C.z + vTex2C.x + vTex2C.y;
	float hL = vTex1L.z + vTex2L.x + vTex2L.y;
	float hR = vTex1R.z + vTex2R.x + vTex2R.y;
	float hT = vTex1T.z + vTex2T.x + vTex2T.y;
	float hB = vTex1B.z + vTex2B.x + vTex2B.y;

	vec2 vV;
	vV.x = -g_fG / g_fGridSizeInMeter * (hR - hC);
	vV.y = -g_fG / g_fGridSizeInMeter * (hB - hC);
	vV *= g_fElapsedTimeInSec;
	vTex1C.xy += vV;

	// 2.1.4. Boundary Conditions

	if (((vTex1C.z <= EPS * g_fGridSizeInMeter) && (vTex2C.x + vTex2C.y > hR)) ||
		((vTex1R.z <= EPS * g_fGridSizeInMeter) && (vTex2R.x + vTex2R.y > hC)))
	{
		vTex1C.x = 0.0;
	}

	if (((vTex1C.z <= EPS * g_fGridSizeInMeter) && (vTex2C.x + vTex2C.y > hB)) ||
		((vTex1B.z <= EPS * g_fGridSizeInMeter) && (vTex2B.x + vTex2B.y > hC)))
	{
		vTex1C.y = 0.0;
	}

	// We also clamp the magnitudes
	float l = length(vTex1C.xy);
	if (l > 0.0)
	{
		float alpha = 0.5;
		vTex1C.xy /= l;
		l = min(l, alpha * g_fGridSizeInMeter / g_fElapsedTimeInSec);
		vTex1C.xy *= l;
	}

	// hack blur
	/*{
		float fMinH = min( min( min( hL, hR ), min( hT, hB ) ), zC );
		float fMaxH = max( max( max( hL, hR ), max( hT, hB ) ), zC );
		//float fW = clamp( ( fMaxH - fMinH )*g_fGridSizeInMeter/g_fHackBlurDepth, 0.0, 1.0 );
		float fW = smoothstep( 0.5, 1.0, ( fMaxH - fMinH )*10.0 );

		float fTexLW = min( (hL-hC)*(1.0/4.0), vTex1L.z );
		float fTexRW = min( (hR-hC)*(1.0/4.0), vTex1R.z );
		float fTexTW = min( (hT-hC)*(1.0/4.0), vTex1T.z );
		float fTexBW = min( (hB-hC)*(1.0/4.0), vTex1B.z );

		float fTexAddition = fTexLW + fTexRW + fTexTW + fTexBW;
		vTex1C.z += fTexAddition*0.2499*fW;
	}*/

	// 2.1.5. Stability Enhancements
	if (vTex1C.z < 0.0)
	{
		vTex1C.z = 0.0;
	}

	/*if ( vTex1C.z > EPS*2.0 )
	{
		//sand:
		float fVelLen = -( length( vTex1C.xy ) - 0.1 ) * 0.0001;
		fVelLen = clamp( fVelLen, -0.000001, 0.000001 );
		float fAddSand = fVelLen;
		vTex2C.y += fAddSand;

		vTex2C.y = max( 0.0, vTex2C.y );
	}*/

	outColor0 = vTex1C;
	outColor1 = vTex2C;

}