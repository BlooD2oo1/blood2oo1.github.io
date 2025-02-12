
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

import * as mat4 from './dependencies/gl-matrix/esm/mat4.js';
import { SWE } from './swe.js';

class WebGLApp {
    constructor() {
        this.canvas = document.createElement("canvas");

        this.webapp = document.querySelector(".webapp");
        this.webapp.appendChild(this.canvas);
        //document.body.appendChild(this.canvas);
        this.gl = this.canvas.getContext("webgl2");
        this.resize();
        window.addEventListener("resize", () => this.resize());

        this.mousePosition = { x: 0, y: 0 };
        this.canvas.addEventListener("mousemove", (event) => this.updateMousePosition(event));

        const ext = this.gl.getExtension("EXT_color_buffer_float");
        if (!ext) {
            console.error("EXT_color_buffer_float extension not supported!");
        }

        this.screenPresent = new SWE(this.gl);

        this.loadResources();
        this.screenPresent.loadResources();
        this.startRenderLoop();
    }

    updateMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePosition.x = (event.clientX - rect.left) / rect.width;
        this.mousePosition.y = (event.clientY - rect.top) / rect.height;
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

    loadResources() {

        this.screenVertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, 'src/shaders/vsPresent.glsl');
        this.screenFragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, 'src/shaders/psPresent.glsl');

        this.screenProgram = this.gl.createProgram();
        this.gl.attachShader(this.screenProgram, this.screenVertexShader);
        this.gl.attachShader(this.screenProgram, this.screenFragmentShader);
        this.gl.linkProgram(this.screenProgram);

        if (!this.gl.getProgramParameter(this.screenProgram, this.gl.LINK_STATUS)) {
            console.error(this.gl.getProgramInfoLog(this.screenProgram));
        }

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

    startRenderLoop() {
        console.log("All resources loaded, starting render loop.");
        requestAnimationFrame(this.loop.bind(this));
    }

    loop() {
        this.render();
        requestAnimationFrame(this.loop.bind(this));
    }

    render() {
        // Render to the 512x512 framebuffer
        this.screenPresent.render();

        //set the viewport to the size of the canvas
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        // Render the framebuffer texture to the screen
        this.gl.clearColor(0.0, 0.1, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.screenProgram);
        this.gl.bindVertexArray(this.screenVao);

        const texture = this.screenPresent.getRenderTexture();
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.screenProgram, "uTexture"), 0);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

        // Pass mouse position to the fragment shader
        this.gl.uniform2f(this.gl.getUniformLocation(this.screenProgram, "uMousePosition"), this.mousePosition.x, 1.0-this.mousePosition.y);


        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}

const app = new WebGLApp();
