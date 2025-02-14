import { createShaderProgram } from './webglapp.js';

export class SWE {
    constructor(gl) {
        this.gl = gl;
        this.width = 512;
        this.height = 512;
    }

    async init() {

        const [
            [vs_passInit, ps_passInit, program_passInit],
                [vs_pass01, ps_pass01, program_pass01],
                [vs_pass02, ps_pass02, program_pass02],
                [vs_pass03, ps_pass03, program_pass03]
        ] = await Promise.all([
            createShaderProgram(this.gl, 'src/shaders/vsSWEPass.glsl', 'src/shaders/psSWEInit.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsSWEPass.glsl', 'src/shaders/psSWEPass01.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsSWEPass.glsl', 'src/shaders/psSWEPass02.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsSWEPass.glsl', 'src/shaders/psSWEPass03.glsl')
        ]);

        this.program_SWEPassInit = program_passInit;
        this.VS_SWEPassInit = vs_passInit;
        this.PS_SWEPassInit = ps_passInit;

        this.program_SWEPass01 = program_pass01;
        this.VS_SWEPass01 = vs_pass01;
        this.PS_SWEPass01 = ps_pass01;

        this.program_SWEPass02 = program_pass02;
        this.VS_SWEPass02 = vs_pass02;
        this.PS_SWEPass02 = ps_pass02;

        this.program_SWEPass03 = program_pass03;
        this.VS_SWEPass03 = vs_pass03;
        this.PS_SWEPass03 = ps_pass03;

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

        const positionLocation = this.gl.getAttribLocation(this.program_SWEPass01, "position");
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Create the first framebuffer and texture
        this.currentFramebuffer = this.gl.createFramebuffer();
        this.currentTexture = this.createTextureAndFramebuffer(this.currentFramebuffer);

        // Create the second framebuffer and texture
        this.otherFramebuffer = this.gl.createFramebuffer();
        this.otherTexture = this.createTextureAndFramebuffer(this.otherFramebuffer);

        this.renderInit();
    }

    createTextureAndFramebuffer(framebuffer) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, this.width, this.height, 0, this.gl.RGBA, this.gl.FLOAT, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);

        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer is not complete:', status.toString(16));
        }

        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        return texture;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getRenderTexture() {
        return this.otherTexture;
    }

    renderInit() {
        // Bind the current framebuffer and set the viewport
        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.otherFramebuffer);
        // Render to the framebuffer
        this.gl.useProgram(this.program_SWEPassInit);
        this.gl.bindVertexArray(this.vao);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        // Unbind the framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }


    render() {
        // Bind the current framebuffer and set the viewport
        
        this.gl.viewport(0, 0, this.width, this.height);

        // Pass 01
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.currentFramebuffer);
        this.gl.useProgram(this.program_SWEPass01);
        this.gl.bindVertexArray(this.vao);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.otherTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program_SWEPass01, "uTexture"), 0);
        this.gl.uniform2f(this.gl.getUniformLocation(this.program_SWEPass01, "uRTRes"), this.getWidth(), this.getHeight());
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        [this.currentFramebuffer, this.otherFramebuffer] = [this.otherFramebuffer, this.currentFramebuffer];
        [this.currentTexture, this.otherTexture] = [this.otherTexture, this.currentTexture];

        // Pass 02
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.currentFramebuffer);
        this.gl.useProgram(this.program_SWEPass02);
        this.gl.bindVertexArray(this.vao);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.otherTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program_SWEPass02, "uTexture"), 0);
        this.gl.uniform2f(this.gl.getUniformLocation(this.program_SWEPass02, "uRTRes"), this.getWidth(), this.getHeight());
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        [this.currentFramebuffer, this.otherFramebuffer] = [this.otherFramebuffer, this.currentFramebuffer];
        [this.currentTexture, this.otherTexture] = [this.otherTexture, this.currentTexture];

        // Pass 03
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.currentFramebuffer);
        this.gl.useProgram(this.program_SWEPass03);
        this.gl.bindVertexArray(this.vao);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.otherTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program_SWEPass03, "uTexture"), 0);
        this.gl.uniform2f(this.gl.getUniformLocation(this.program_SWEPass03, "uRTRes"), this.getWidth(), this.getHeight());
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        [this.currentFramebuffer, this.otherFramebuffer] = [this.otherFramebuffer, this.currentFramebuffer];
        [this.currentTexture, this.otherTexture] = [this.otherTexture, this.currentTexture];

        // Unbind the framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
}
