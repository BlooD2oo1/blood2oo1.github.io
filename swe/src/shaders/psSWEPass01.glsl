#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
layout(location = 0) out vec4 outColor0;
layout(location = 1) out vec4 outColor1;

#GLOBALS

uniform vec2 g_vGizmo_ClickPosition;
uniform int g_iGizmo_MaterialType;
uniform float g_fGizmo_Amount;
uniform float g_fGizmo_Radius;

uniform float g_fEmitter_Source;
uniform float g_fEmitter_Drain;

uniform ivec2 uMouseButtons;


//	tex1:
//		x: velocity x+1/2
//		y: velocity y+1/2
//		z: water depth
//		w: velocity delta
//	tex2:
//		x: rock depth
//		y: sand depth
//		z: -
//		w: -


// Velocity Advection

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

	float dt = -g_fAdvectSpeed * g_fElapsedTimeInSec / g_fGridSizeInMeter;
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
		vec2 v0 = vTex1C.xy * dt / g_vRTRes;
		vec2 vk1 = textureLod(g_tTex1, vTexCoord + v0, 0.0).xy * dt / g_vRTRes;
		vec2 vk0 = (v0 + vk1) * 0.5;
		outColor0 = textureLod(g_tTex1, vTexCoord + vk0, 0.0);
		outColor1 = textureLod(g_tTex2, vTexCoord + vk0, 0.0);
	}

	outColor0.xy *= g_fAdvectDissipation;

	//outColor0.x = vTexC.x;
	//outColor0.y = vTexC.y;
	outColor0.z = vTex1C.z; // viztomeget nem advectalunk mert tomegmegmaradas szerintem bukik
	outColor0.w = length( outColor0.xy - vTex1C.xy );

	{
		// sand "blur"

		float hC = vTex2C.x + vTex2C.y;
		float hL = vTex2L.x + vTex2L.y;
		float hR = vTex2R.x + vTex2R.y;
		float hT = vTex2T.x + vTex2T.y;
		float hB = vTex2B.x + vTex2B.y;

		float fFlowSpeed = 0.1;
		float fAdd_x_L = (hL - hC) * fFlowSpeed;
		float fAdd_x_R = (hR - hC) * fFlowSpeed;
		float fAdd_y_T = (hT - hC) * fFlowSpeed;
		float fAdd_y_B = (hB - hC) * fFlowSpeed;

		fAdd_x_L = min( fAdd_x_L, vTex2L.y );
		fAdd_x_R = min( fAdd_x_R, vTex2R.y );
		fAdd_y_T = min( fAdd_y_T, vTex2T.y );
		fAdd_y_B = min( fAdd_y_B, vTex2B.y );

		vec2 vAddDir = vec2( fAdd_x_L + fAdd_x_R, fAdd_y_T + fAdd_y_B );
		float fAddLen = length( vAddDir );

		//fAddLen = min( fAddLen, ( vTex2L.y + vTex2R.y + vTex2T.y + vTex2B.y ) );

		if ( fAddLen > 0.0 )
		{
			float fMinSlope = g_fSandSlope;
			float fAdd = max( 0.0, fAddLen - fMinSlope );

			vAddDir = vAddDir/fAddLen * fAdd;

			vTex2C.y += vAddDir.x + vAddDir.y;
		}
		vTex2C.y = max( 0.0, vTex2C.y );
	}

	outColor1 = vTex2C;

	if (g_iGizmo_MaterialType != 0)
	{
		float fRad = g_fGizmo_Radius / g_fGridSizeInMeter;
		vec2 vDir = vTexCoord - g_vGizmo_ClickPosition;
		float fDirLen = length(vDir);
		float fW = max(0.0, (fRad - fDirLen) / fRad);
		fW = 0.5 - 0.5 * cos(fW * PI2);

		if (g_iGizmo_MaterialType == 1)
		{
			outColor1.x += fW * g_fGizmo_Amount * g_fElapsedTimeInSec;
			outColor1.x = clamp(outColor1.x, -0.1, 0.2);
		}
		else if (g_iGizmo_MaterialType == 2)
		{
			outColor1.y += fW * g_fGizmo_Amount * g_fElapsedTimeInSec;
			outColor1.y = max(outColor1.y, 0.0);
			
		}
		else if (g_iGizmo_MaterialType == 3)
		{
			outColor0.z += fW * g_fGizmo_Amount * g_fElapsedTimeInSec;
			outColor0.z = max(outColor0.z, 0.0);
		}

	}

	float fTimeSec = float( g_iSWEFrameCount ) * g_fElapsedTimeInSec;

	{
		float fSinTime = (sin( fTimeSec * 0.001 )*0.5+0.5);
		fSinTime = fSinTime*0.9+0.1;
		float fRad = 0.02;
		vec2 vDir = vTexCoord - vec2(0.85, 0.85);
		float fDirLen = length(vDir);
		float fW = max(0.0, (fRad - fDirLen) / fRad);
		fW = 0.5 - 0.5 * cos(fW * PI2);
		outColor0.z += fW * fSinTime * g_fEmitter_Source * g_fElapsedTimeInSec;
	}

	{
		float fSinTime = (sin( fTimeSec * 0.001 + PI05 )*0.5+0.5);
		fSinTime = fSinTime*0.9+0.1;
		float fRad = 0.08;
		vec2 vDir = vTexCoord - vec2(0.15, 0.15);
		float fDirLen = length(vDir);
		float fW = max(0.0, (fRad - fDirLen) / fRad);
		fW = 0.5 - 0.5 * cos(fW * PI2);
		outColor0.z -= fW * fSinTime * g_fEmitter_Drain * g_fElapsedTimeInSec;
	}
}