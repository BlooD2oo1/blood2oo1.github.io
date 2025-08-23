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

// Height Integration

void main()
{
	ivec2 tc = ivec2(vTexCoord * g_vRTRes);

	vec4 vTex1C = texelFetch(g_tTex1, tc, 0);
	vec4 vTex1L = (tc.x > 0) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(-1, 0)) : vTex1C * vec4(0.0, 0.0, 1.0, 1.0);
	vec4 vTex1R = (tc.x < int(g_vRTRes.x) - 1) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(1, 0)) : vTex1C * vec4(0.0, 0.0, 1.0, 1.0);
	vec4 vTex1T = (tc.y > 0) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(0, -1)) : vTex1C * vec4(0.0, 0.0, 1.0, 1.0);
	vec4 vTex1B = (tc.y < int(g_vRTRes.y) - 1) ? texelFetchOffset(g_tTex1, tc, 0, ivec2(0, 1)) : vTex1C * vec4(0.0, 0.0, 1.0, 1.0);

	vec4 vTex2C = texelFetch(g_tTex2, tc, 0);
	vec4 vTex2L = (tc.x > 0) ? texelFetchOffset(g_tTex2, tc, 0, ivec2(-1, 0)) : vTex2C * vec4(1.0, 1.0, 1.0, 1.0);
	vec4 vTex2R = (tc.x < int(g_vRTRes.x) - 1) ? texelFetchOffset(g_tTex2, tc, 0, ivec2(1, 0)) : vTex2C * vec4(1.0, 1.0, 1.0, 1.0);
	vec4 vTex2T = (tc.y > 0) ? texelFetchOffset(g_tTex2, tc, 0, ivec2(0, -1)) : vTex2C * vec4(1.0, 1.0, 1.0, 1.0);
	vec4 vTex2B = (tc.y < int(g_vRTRes.y) - 1) ? texelFetchOffset(g_tTex2, tc, 0, ivec2(0, 1)) : vTex2C * vec4(1.0, 1.0, 1.0, 1.0);

	////////////////////////////////////////////////////////////////

	float fVel_x_L = vTex1L.x;
	float fVel_x_R = vTex1C.x;
	float fVel_y_T = vTex1T.y;
	float fVel_y_B = vTex1C.y;

	// szerintem az elso naiv megoldas latvanyosabb ha eros a velocity advection ( nem annyira alakulnak ki a zavaro V-alakok ), de nem annyira stabil, rezonal neha
#if 0
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

	float sL = (vTex1L.x >= 0.0) ? vTex2L.y : vTex2C.y;
	float sR = (vTex1C.x <= 0.0) ? vTex2R.y : vTex2C.y;
	float sT = (vTex1T.y >= 0.0) ? vTex2T.y : vTex2C.y;
	float sB = (vTex1C.y <= 0.0) ? vTex2B.y : vTex2C.y;
	sL = sR = sT = sB = 0.05;
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

	vTex1C.z += dH * g_fElapsedTimeInSec;

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
	}

#if 0
	if (vTex1C.z > 0.0)
	{
		/*{
			// 2.1.5. Stability Enhancements
			float beta = 2.0;
			float hAvgMax = beta * g_fGridSizeInMeter / (g_fG * g_fElapsedTimeInSec);
			float hAdj = max(0.0, (sR + sL + sB + sT) / 4.0 - hAvgMax);
			//float hAdj = max( 0.0, (vTexL.z+vTexR.z+vTexT.z+vTexB.z)/4.0 - hAvgMax );

			sL -= hAdj;
			sR -= hAdj;
			sT -= hAdj;
			sB -= hAdj;
		}*/

		/*float hC = vTex1C.z + vTex2C.x + vTex2C.y;
		float hL = vTex1L.z + vTex2L.x + vTex2L.y;
		float hR = vTex1R.z + vTex2R.x + vTex2R.y;
		float hT = vTex1T.z + vTex2T.x + vTex2T.y;
		float hB = vTex1B.z + vTex2B.x + vTex2B.y;
		//gradient of h*:
		vec2 gradh = vec2( (hR-hL)*0.5, (hB-hT)*0.5 );

		vec2 vV;
		vV.x = -g_fG / g_fGridSizeInMeter * (hR - hC);
		vV.y = -g_fG / g_fGridSizeInMeter * (hB - hC);
		vV *= g_fElapsedTimeInSec;*/

		float dH = -((sR * fVel_x_R - sL * fVel_x_L) / g_fGridSizeInMeter + (sB * fVel_y_B - sT * fVel_y_T) / g_fGridSizeInMeter);
		dH = dH * g_fSandFlow;
		//dH = dH * 2500.0 * vTex1C.w;

		//dH = dH * vTex1C.w;
		//dH = clamp(dH, -0.000005, 0.000005);
		
		vTex2C.y += dH * g_fElapsedTimeInSec;

		if (vTex2C.y < 0.0)
		{
			vTex2C.y = 0.0;
		}
	}
#endif
	//if (vTex1C.z > 0.0)
	{
		vec2 vVel = vec2(fVel_x_R + fVel_x_L, fVel_y_T + fVel_y_B) * 0.5;
		float fVel = length(vVel);
		float fSandToDilute = min(vTex2C.y, fVel*fVel * 0.0001 );
		float fSandToSettle = vTex1C.w * 0.0001;

		float fTransfer = fSandToDilute - fSandToSettle;

		vTex1C.w += fTransfer;
		vTex2C.y -= fTransfer;

		vTex1C.w = max(0.0, vTex1C.w);
		vTex2C.y = max(0.0, vTex2C.y);
	}



	outColor0 = vTex1C;
	outColor1 = vTex2C;
}