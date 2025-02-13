import { loadShader } from './webglapp.js';

export function createShader(gl, type, url) {

    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false); // Synchronous request
    xhr.send(null);
    if (xhr.status === 200) {
    } else {
        console.error(`Failed to load file from ${url}`);
        return null;
    }

    const shaderSource = xhr.responseText;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
// screenpresent.js
export class SWE {
    constructor(gl) {
        this.gl = gl;
    }

    async init() {
        const [vs, ps] = await Promise.all([
            loadShader(this.gl, this.gl.VERTEX_SHADER, 'src/shaders/vsSWE.glsl'),
            loadShader(this.gl, this.gl.FRAGMENT_SHADER, 'src/shaders/psSWE.glsl')
        ]);

        this.screenVertexShader = vs;
        this.screenFragmentShader = ps;

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, this.screenVertexShader);
        this.gl.attachShader(this.program, this.screenFragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error(this.gl.getProgramInfoLog(this.program));
        }

        const quadVertices = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1
        ]);

        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        this.vbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, "position");
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        {
            this.framebuffer = this.gl.createFramebuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);

            this.renderTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.renderTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, 256, 256, 0, this.gl.RGBA, this.gl.FLOAT, null);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.renderTexture, 0);

            const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
                console.error('Framebuffer is not complete:', status.toString(16));
            }

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
    }

    getRenderTexture() {
        return this.renderTexture;
    }

    render() {
        // Bind the framebuffer and set the viewport to 512x512
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.viewport(0, 0, 512, 512);

        // Clear the framebuffer
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Render to the framebuffer
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // Unbind the framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
}
