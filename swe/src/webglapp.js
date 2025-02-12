import * as mat4 from './dependencies/gl-matrix/esm/mat4.js';
import { ScreenPresent } from './screenpresent.js';

class WebGLApp {
    constructor() {
        this.canvas = document.createElement("canvas");

        this.webapp = document.querySelector(".webapp");
        this.webapp.appendChild(this.canvas);
        //document.body.appendChild(this.canvas);
        this.gl = this.canvas.getContext("webgl2");
        this.resize();
        window.addEventListener("resize", () => this.resize());

        this.screenPresent = new ScreenPresent(this.gl);
        this.initScreenShader();
        this.initScreenBuffers();
    }

    resize() {
        //let iSize = Math.min(window.innerWidth, window.innerHeight);
        const contentRect = this.webapp.getBoundingClientRect();
        let iSize = Math.min(contentRect.width, contentRect.height);
        
        iSize = Math.floor(iSize * 0.9);
        iSize = iSize - (iSize % 256);
        iSize = Math.max(256, iSize);
        this.canvas.width = iSize;
        this.canvas.height = iSize;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    initScreenShader() {
        const vertexShaderSource = `#version 300 es
        precision highp float;
        in vec2 position;
        in vec2 texCoord;
        out vec2 vTexCoord;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
            vTexCoord = texCoord;
        }`;

        const fragmentShaderSource = `#version 300 es
        precision highp float;
        in vec2 vTexCoord;
        out vec4 outColor;
        uniform sampler2D uTexture;
        void main() {
            outColor = texture(uTexture, vTexCoord);
        }`;

        this.screenVertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        this.screenFragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.screenProgram = this.gl.createProgram();
        this.gl.attachShader(this.screenProgram, this.screenVertexShader);
        this.gl.attachShader(this.screenProgram, this.screenFragmentShader);
        this.gl.linkProgram(this.screenProgram);

        if (!this.gl.getProgramParameter(this.screenProgram, this.gl.LINK_STATUS)) {
            console.error(this.gl.getProgramInfoLog(this.screenProgram));
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

    initScreenBuffers() {
        const quadVertices = new Float32Array([
            // Positions   // TexCoords
            -1, -1, 0, 0,
            1, -1, 1, 0,
            -1, 1, 0, 1,
            -1, 1, 0, 1,
            1, -1, 1, 0,
            1, 1, 1, 1
        ]);

        this.screenVao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.screenVao);

        this.screenVbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.screenVbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.screenProgram, "position");
        const texCoordLocation = this.gl.getAttribLocation(this.screenProgram, "texCoord");

        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);

        this.gl.enableVertexAttribArray(texCoordLocation);
        this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
    }

    update() {
        // Future update logic goes here
    }

    render() {
        // Render to the 512x512 framebuffer
        this.screenPresent.render();

        // Render the framebuffer texture to the screen
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.screenProgram);
        this.gl.bindVertexArray(this.screenVao);

        const texture = this.screenPresent.getRenderTexture();
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.screenProgram, "uTexture"), 0);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}

const app = new WebGLApp();
function loop() {
    app.update();
    app.render();
    requestAnimationFrame(loop);
}
loop();
