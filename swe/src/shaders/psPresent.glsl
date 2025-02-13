#version 300 es
precision highp float;
in vec2 vTexCoord;
out vec4 outColor;
uniform sampler2D uTexture;
uniform vec2 uMousePosition;

void main()
{
    outColor = texture(uTexture, vTexCoord);
    outColor.rgb += pow( max( 0.0, ( 0.05 - length( vTexCoord - uMousePosition ) )/0.05 ), 5.0 );
    outColor.a = 1.0;

    outColor.rgb = max(outColor.rgb, 0.0);
    outColor.rgb = 1.0 - exp(-outColor.rgb);
    outColor.rgb = pow(outColor.rgb, vec3( 0.454545 ) );
}
