#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec3 position;
out vec2 vTexCoord;
out vec4 vShadowCoord;

#GLOBALS

void main()
{
    vTexCoord = position.xy;
    ivec2 tc = ivec2( vTexCoord * vec2( textureSize(g_tTex, 0) ) );
	vec4 vTexC = texelFetch(g_tTex, tc, 0);
	float fZ = (vTexC.w + vTexC.z);

    vec3 modifiedPosition = vec3(position.xy-vec2(0.5), fZ );
    vShadowCoord = g_matVPShadow * vec4( modifiedPosition, 1.0 );
    gl_Position = g_matVP * vec4(modifiedPosition, 1.0);
}