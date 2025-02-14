#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D uTexture;
uniform vec2 uMousePosition;
uniform float fSlider1;
uniform float fSlider2;
uniform vec2 uRTRes;

void main()
{
    // Get the texture resolution
    vec2 vTexRes = vec2(textureSize(uTexture, 0));

    // Calculate the pixel coordinates
    vec2 pixelCoord = vTexCoord * uRTRes;

    // Convert pixel coordinates back to texture coordinates
    vec2 texCoord = pixelCoord / vTexRes;

    outColor = vec4(0.1, 0.1, 0.1, 1.0);
    if ( texCoord.x >= 0.0 && texCoord.x < 1.0 && texCoord.y >= 0.0 && texCoord.y < 1.0 )
    {
        outColor = texture(uTexture, texCoord);
    };    

    outColor.rgb += pow( max( 0.0, ( 20.0 - length( (pixelCoord - uMousePosition) ) )/20.0 ), 5.0 );
    outColor.a = 1.0;

    outColor.r *= fSlider1;
    outColor.g *= fSlider2;

    outColor.rgb = max(outColor.rgb, 0.0);
    outColor.rgb = 1.0 - exp(-outColor.rgb);
    outColor.rgb = pow(outColor.rgb, vec3( 0.454545 ) );
}
