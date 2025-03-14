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
//		w: dissolved sand
//	tex2:
//		x: rock depth
//		y: sand depth
//		z: -
//		w: -

// Height Integration

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

	float fVel_x_L = vTex1L.x;
	float fVel_x_R = vTex1C.x;
	float fVel_y_T = vTex1T.y;
	float fVel_y_B = vTex1C.y;

	// szerintem az elso naiv megoldas latvanyosabb ha eros a velocity advection ( nem annyira alakulnak ki a zavaro V-alakok ), de nem annyira stabil, rezonal neha
#if 1
	//basic:
	float hL = (vTex1L.z + vTex1C.z) * 0.5;
	float hR = (vTex1R.z + vTex1C.z) * 0.5;
	float hT = (vTex1T.z + vTex1C.z) * 0.5;
	float hB = (vTex1B.z + vTex1C.z) * 0.5;
#else
	// We also found that it yields a more stable simulation:
	float hL = (vTex1L.x >= 0.0) ? vTex1L.z : vTex1C.z;
	float hR = (vTex1C.x <= 0.0) ? vTex1R.z : vTex1C.z;
	float hT = (vTex1T.y >= 0.0) ? vTex1T.z : vTex1C.z;
	float hB = (vTex1C.y <= 0.0) ? vTex1B.z : vTex1C.z;
#endif

	{
		// 2.1.5. Stability Enhancements
		float beta = 2.0;
		float hAvgMax = beta * g_fGridSizeInMeter / (g_fG * g_fElapsedTimeInSec);
		float hAdj = max(0.0, (hR + hL + hB + hT) / 4.0 - hAvgMax);
		//float hAdj = max( 0.0, (vTexL.z+vTexR.z+vTexT.z+vTexB.z)/4.0 - hAvgMax );

		hL -= hAdj;
		hR -= hAdj;
		hT -= hAdj;
		hB -= hAdj;
	}

	float dH = -((hR * fVel_x_R - hL * fVel_x_L) / g_fGridSizeInMeter + (hB * fVel_y_B - hT * fVel_y_T) / g_fGridSizeInMeter);

	vTex1C.z += dH * (g_fElapsedTimeInSec);

	// 2.2. Overshooting Reduction
	{
		float hC = vTex1C.z + vTex2C.x + vTex2C.y;
		float hL = vTex1L.z + vTex2L.x + vTex2L.y;
		float hR = vTex1R.z + vTex2R.x + vTex2R.y;
		float hT = vTex1T.z + vTex2T.x + vTex2T.y;
		float hB = vTex1B.z + vTex2B.x + vTex2B.y;

		float lamdaedge = 2.0 * g_fGridSizeInMeter;
		float alphaedge = 0.5;
		if (((hC - hL) > lamdaedge) && (hC > hR))
		{
			vTex1C.z += alphaedge * (max(0.0, (vTex1C.z + vTex1R.z) * 0.5) - vTex1C.z);
		}
		if (((hC - hR) > lamdaedge) && (hC > hL))
		{
			vTex1C.z += alphaedge * (max(0.0, (vTex1C.z + vTex1L.z) * 0.5) - vTex1C.z);
		}
		if (((hC - hT) > lamdaedge) && (hC > hB))
		{
			vTex1C.z += alphaedge * (max(0.0, (vTex1C.z + vTex1B.z) * 0.5) - vTex1C.z);
		}
		if (((hC - hB) > lamdaedge) && (hC > hT))
		{
			vTex1C.z += alphaedge * (max(0.0, (vTex1C.z + vTex1T.z) * 0.5) - vTex1C.z);
		}
	}

	if (vTex1C.z < 0.0)
	{
		vTex1C.z = 0.0;
		vTex1C.w = 0.0;
	}

	//if ( vTex1C.z > 0.0 )
	{
		float hL = (vTex2L.y + vTex2C.y) * 0.5;
		float hR = (vTex2R.y + vTex2C.y) * 0.5;
		float hT = (vTex2T.y + vTex2C.y) * 0.5;
		float hB = (vTex2B.y + vTex2C.y) * 0.5;

		{
			// 2.1.5. Stability Enhancements
			float beta = 2.0;
			float hAvgMax = beta * g_fGridSizeInMeter / (g_fG * g_fElapsedTimeInSec);
			float hAdj = max(0.0, (hR + hL + hB + hT) / 4.0 - hAvgMax);
			//float hAdj = max( 0.0, (vTexL.z+vTexR.z+vTexT.z+vTexB.z)/4.0 - hAvgMax );

			hL -= hAdj;
			hR -= hAdj;
			hT -= hAdj;
			hB -= hAdj;
		}

		float dH = -((hR * fVel_x_R - hL * fVel_x_L) / g_fGridSizeInMeter + (hB * fVel_y_B - hT * fVel_y_T) / g_fGridSizeInMeter);

		vTex2C.y += dH * (g_fElapsedTimeInSec)*0.005;

		if ( vTex2C.y < 0.0 )
		{
			vTex2C.y = 0.0;
		}
	}

	outColor0 = vTex1C;
	outColor1 = vTex2C;
}