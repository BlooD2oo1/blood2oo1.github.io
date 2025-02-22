#version 300 es
precision highp float;
precision highp int;

in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D g_tTex;
uniform vec2 g_vRTRes;
uniform vec2 uMousePosition;
uniform float fSlider1;
uniform float fSlider2;


void main()
{
    // Get the texture resolution
    ivec2 viTexRes = textureSize(g_tTex, 0);
	vec2 vTexRes = vec2(viTexRes);
    outColor = texelFetch(g_tTex, ivec2( vTexCoord*vTexRes ), 0);
    outColor.rgb = max(outColor.rgb, 0.0);
    outColor.rgb = 1.0 - exp(-outColor.rgb);
    outColor.rgb = pow(outColor.rgb, vec3( 0.454545 ) );
    
    outColor.a = 1.0;//!
}
