#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D uTexture;
uniform vec2 uRTRes;
uniform vec2 uMousePosition;
uniform float fSlider1;
uniform float fSlider2;


void main()
{
    // Get the texture resolution
    vec2 vTexRes = vec2(textureSize(uTexture, 0));

    // Calculate the pixel coordinates
    vec2 vPixelCoord = vTexCoord * uRTRes;
    ivec2 viPixelCoord = ivec2(vPixelCoord);

    // Convert pixel coordinates back to texture coordinates
    vec2 texCoord = vPixelCoord / vTexRes;

    outColor = vec4(0.1, 0.1, 0.1, 1.0);
    if ( texCoord.x >= 0.0 && texCoord.x < 1.0 && texCoord.y >= 0.0 && texCoord.y < 1.0 )
    {
        outColor = texelFetch(uTexture, viPixelCoord, 0);
        float fWater = outColor.b * 100.0;
        outColor.rgb = outColor.www+0.3;
        outColor.b += fWater;
        

        outColor.rgb *= fSlider1;
        outColor.rgb /= fSlider2;
    };    

    outColor.rgb += pow( max( 0.0, ( 20.0 - length( (vPixelCoord - uMousePosition) ) )/20.0 ), 5.0 );
    outColor.a = 1.0;



    outColor.rgb = max(outColor.rgb, 0.0);
    outColor.rgb = 1.0 - exp(-outColor.rgb);
    outColor.rgb = pow(outColor.rgb, vec3( 0.454545 ) );
}
