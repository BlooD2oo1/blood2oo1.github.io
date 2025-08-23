#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec3 position;
out vec4 screencoord;
out vec3 vWorldPos;

#GLOBALS

void main()
{
    vec3 modifiedPosition = position.xyz*0.5;
	modifiedPosition.xy *= 1023.0/1024.0;
    modifiedPosition.z *= 0.2;
    vWorldPos = modifiedPosition;
    gl_Position = g_matVP * vec4(modifiedPosition, 1.0);
    screencoord = gl_Position;    
}