#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord; // Input texture coordinates
in vec4 screencoord;
in vec3 vWorldPos;
out vec4 outColor;

#GLOBALS

bool ClipLineWithBox(vec3 boxExtent, vec3 start, vec3 end, out vec3 clippedStart, out vec3 clippedEnd)
{
    vec3 dir = end - start;
    float tEnter = 0.0;
    float tExit = 1.0;

    for (int i = 0; i < 3; i++) {
        float boxMin = -boxExtent[i];
        float boxMax = boxExtent[i];

        if (abs(dir[i]) > 1e-6) {  // Elkerüljük a nullával osztást
            float t1 = (boxMin - start[i]) / dir[i];
            float t2 = (boxMax - start[i]) / dir[i];

            if (t1 > t2) { // Rendezés
                float temp = t1;
                t1 = t2;
                t2 = temp;
            }

            tEnter = max(tEnter, t1);
            tExit = min(tExit, t2);

            if (tEnter > tExit) return false; // Teljesen kívül van a szakasz
        }
        else if (start[i] < boxMin || start[i] > boxMax) {
            return false; // A szakasz párhuzamos az adott tengellyel, de kívül van
        }
    }

    clippedStart = start + tEnter * dir;
    clippedEnd = start + tExit * dir;
    return true;
}

void main()
{
    ivec2 viTexRes = textureSize(g_tTex1, 0);
    vec2 vTexRes = vec2(viTexRes);
	vec3 vScreenCoord = screencoord.xyz/ screencoord.w;
	vec4 vTexMisc = texelFetch(g_tTex1, ivec2((vScreenCoord.xy*0.5+0.5) * vTexRes), 0);
	vec3 vNormal = vTexMisc.rgb;
	float fDepth = vTexMisc.a;

	// fDepth-bol es a g_matVPInv-bol szamitsd ki a vilag koordinatat:
	vec4 vWorldPosTerrain = g_matVPInv * vec4(vScreenCoord.xy, fDepth, 1.0);
	vWorldPosTerrain /= vWorldPosTerrain.w;
	vec3 vViewDir = g_vViewDir;

	vec3 vCFogLight = vec3(0.7, 0.7, 0.85);
	vec3 vCFogShadow = vec3(0.01, 0.03, 0.04);
	float fFogColor = 0.0;
	float fFog = 0.0;
	vec3 vBoxExtent = vec3(0.5, 0.5, 0.2/2.0);
    vec3 vStart,vEnd;
	if (ClipLineWithBox(vBoxExtent, vWorldPos, vWorldPosTerrain.xyz, vStart,vEnd))
	{
        vec3 vDir = vEnd-vStart;
        float fDirLen = length(vDir);
		vDir = vDir / fDirLen;

        fFogColor = 1.0;
        fFog = 1.0;
		float step = 0.01;
        float fDensity = 3000.0;
        for ( float f = random(vScreenCoord.xy)*step; f < fDirLen; f+= step )
        {
			vec3 vPos = vStart + vDir * f;
            vec4 vShadowPos = g_matVPShadow * vec4(vPos, 1.0);
			vShadowPos /= vShadowPos.w;
            vec3 shadowCoord = vShadowPos.xyz * 0.5 + 0.5;
            float fShadow = BasicShadow( g_tShadowMap, shadowCoord );


			float fZ = vBoxExtent.z - (vStart.z + vDir.z * f);
            // height dependent density:
            //float fHeight = mix( 1.0, 0.9, 1.0-exp( -fZ ) );
            float fHeight = 1.0/(pow( fZ, 5.0 )*fDensity+1.0);
            fFog *= fHeight;
            fFogColor = mix(fFogColor, fShadow, fFog*0.2 );
        }
        fFog = 1.0 - fFog;
	}



	outColor.rgb = mix(vCFogShadow, vCFogLight, fFogColor);
    outColor.a = fFog;
}
