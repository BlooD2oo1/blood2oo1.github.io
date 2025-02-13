import * as mat4 from './dependencies/gl-matrix/esm/mat4.js';

import { Present } from './present.js';

export async function loadShader(gl, type, url) {
    console.log(url, "\nloading...\n");
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch shader: ${url}`);
        }
        const source = await response.text();

        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(`Error compiling shader ${url}:`, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        console.log(url, "\nloaded!\n");
        return shader;
    } catch (error) {
        console.error(error);
        return null;
    }
}
class WebGLApp {
    constructor() {
        this.canvas = document.createElement("canvas");

        this.webapp = document.querySelector(".webapp");
        this.webapp.appendChild(this.canvas);
        //document.body.appendChild(this.canvas);

        this.gl = this.canvas.getContext("webgl2");

        const ext = this.gl.getExtension("EXT_color_buffer_float");
        if (!ext) {
            console.error("EXT_color_buffer_float extension not supported!");
        }

        this.resize();

        window.addEventListener("resize", () => this.resize());

        this.mousePosition = { x: 0, y: 0 };
        this.canvas.addEventListener("mousemove", (event) => this.updateMousePosition(event));

        this.showLoadingMessage();

        this.Present = new Present(this.gl);

        this.init();
    }

    async init() {

        await this.Present.init();

        console.log("All resources loaded, starting render loop.");
        this.hideLoadingMessage();
        requestAnimationFrame(this.render.bind(this));        
    }

    showLoadingMessage() {
        this.loadingDiv = document.createElement("div");
        this.loadingDiv.innerText = "Loading...";
        this.loadingDiv.style.position = "absolute";
        this.loadingDiv.style.top = "50%";
        this.loadingDiv.style.left = "50%";
        this.loadingDiv.style.transform = "translate(-50%, -50%)";
        this.loadingDiv.style.fontSize = "24px";
        this.loadingDiv.style.color = "white";
        document.body.appendChild(this.loadingDiv);
    }

    hideLoadingMessage() {
        if (this.loadingDiv) {
            document.body.removeChild(this.loadingDiv);
        }
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

    getResolution() {
        return { width: this.canvas.width, height: this.canvas.height };
    }

    getMousePosition() {
        return this.mousePosition;
    }

    render() {

        this.Present.render();

        requestAnimationFrame(this.render.bind(this));
    }
}

const app = new WebGLApp();
export { app };
