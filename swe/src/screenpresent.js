// screenpresent.js
export class ScreenPresent {
    constructor(gl) {
        this.gl = gl;
        this.initShaders();
        this.initBuffers();
        this.initRenderTarget();
    }

    initShaders() {
        const vertexShaderSource =
            `#version 300 es
        precision highp float;
        in vec2 position;
        out vec2 vTexCoord;
        void main()
        {
            gl_Position = vec4(position, 0.0, 1.0);
            vTexCoord = position * 0.5 + 0.5; // Convert from [-1, 1] to [0, 1]
        }
        `;

        const fragmentShaderSource =
            `#version 300 es
        precision highp float;
        in vec2 vTexCoord;
        out vec4 outColor;
        void main()
        {
            outColor = vec4(vTexCoord, 0.0, 1.0);
        }
        `;

        this.vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        this.fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, this.vertexShader);
        this.gl.attachShader(this.program, this.fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error(this.gl.getProgramInfoLog(this.program));
        }
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    initBuffers() {
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
    }

    initRenderTarget() {
        this.framebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);

        this.renderTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.renderTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 512, 512, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.renderTexture, 0);

        const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer is not complete:', status.toString(16));
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
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
