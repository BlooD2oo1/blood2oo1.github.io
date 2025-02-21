import { Present } from './present.js';

async function loadShaderFile(url) {
    console.log(url, "\nloading...\n");
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch shader: ${url}`);
        }
        const source = await response.text();
        console.log(url, "\nloaded!\n");
        return source;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function createShaderProgram(gl, vsPath, fsPath) {
    const [vsSource, fsSource, globals] = await Promise.all([
        loadShaderFile(vsPath),
        loadShaderFile(fsPath),
        loadShaderFile('src/shaders/globals.glsl')
    ]);

    if (!vsSource || !fsSource || !globals) {
        return null;
    }

    // Replace #GLOBALS with the content of globals
    const vsSourceWithGlobals = vsSource.replace('#GLOBALS', globals);
    const fsSourceWithGlobals = fsSource.replace('#GLOBALS', globals);

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSourceWithGlobals);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(`Error compiling vertex shader ${vsPath}:`, gl.getShaderInfoLog(vs));
        gl.deleteShader(vs);
        return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSourceWithGlobals);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(`Error compiling fragment shader ${fsPath}:`, gl.getShaderInfoLog(fs));
        gl.deleteShader(fs);
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }

    return [vs, fs, program];
}

class WebGLApp {
    constructor() {

        if (this.isMobileDevice()) {
            this.showMobileWarning();
            return;
        }

        this.canvas = document.createElement("canvas");

        this.webapp = document.querySelector(".webapp");
        this.webapp.appendChild(this.canvas);
        //document.body.appendChild(this.canvas);

        this.gl = this.canvas.getContext("webgl2");

        const ext = this.gl.getExtension("EXT_color_buffer_float");
        if (!ext) {
            console.error("EXT_color_buffer_float extension not supported!");
        }

        const floatLinearExt = this.gl.getExtension("OES_texture_float_linear");
        if (!floatLinearExt) {
            console.error("OES_texture_float_linear extension not supported!");
        }

        this.resize();

        window.addEventListener("resize", () => this.resize());

        this.mousePosition = { x: 0, y: 0 };
        this.canvas.addEventListener("mousemove", (event) => this.handleMouseMove(event));
        this.canvas.addEventListener("mousedown", (event) => this.handleMouseDown(event));
        this.canvas.addEventListener("mouseup", (event) => this.handleMouseUp(event));
        this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

        this.createUIElements();

        this.showLoadingMessage();

        this.Present = new Present(this.gl);

        this.init();

        this.lastFrameTime = performance.now();
        this.frameCount = 0;
    }

    isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    showMobileWarning() {
        const warningDiv = document.createElement("div");
        warningDiv.innerText = "This application only works on desktop browsers.";
        warningDiv.style.position = "absolute";
        warningDiv.style.top = "50%";
        warningDiv.style.left = "50%";
        warningDiv.style.transform = "translate(-50%, -50%)";
        warningDiv.style.fontSize = "24px";
        warningDiv.style.color = "white";
        warningDiv.style.backgroundColor = "black";
        warningDiv.style.padding = "20px";
        warningDiv.style.borderRadius = "10px";
        document.body.appendChild(warningDiv);
    }

    createUIElements() {
        // Create a container for the UI elements
        this.uiContainer = document.createElement('div');
        this.uiContainer.className = 'gui-container';
        this.webapp.appendChild(this.uiContainer); // Append to webapp, not canvas

        // Create buttons
        this.button1 = document.createElement('button');
        this.button1.id = 'button1';
        this.button1.innerText = 'Button 1';
        this.uiContainer.appendChild(this.button1);

        this.button2 = document.createElement('button');
        this.button2.id = 'button2';
        this.button2.innerText = 'Button 2';
        this.uiContainer.appendChild(this.button2);

        // Create sliders with labels
        this.createSlider('slider1', 'Slider 1', 0.0, 1.0, 1.0);
        this.createSlider('slider2', 'Slider 2', 0.0, 1.0, 1.0);

        // Create FPS display
        this.fpsDisplay = document.createElement('div');
        this.fpsDisplay.id = 'fpsDisplay';
        this.fpsDisplay.innerText = 'FPS: 0';
        this.uiContainer.appendChild(this.fpsDisplay);

        // Add event listeners to the buttons
        this.button1.addEventListener('click', () => {
            //console.log('Button 1 clicked');
            // Add your processing logic here
        });

        this.button2.addEventListener('click', () => {
            //console.log('Button 2 clicked');
            // Add your processing logic here
        });
    }

    createSlider(id, label, min, max, value) {
        const container = document.createElement('div');
        container.className = 'slider-container';

        const labelElement = document.createElement('label');
        labelElement.innerText = `${label}: `;
        container.appendChild(labelElement);

        const valueElement = document.createElement('span');
        valueElement.id = `${id}-value`;
        valueElement.innerText = value;
        container.appendChild(valueElement);

        const slider = document.createElement('input');
        slider.id = id;
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = '0.01'; // Set step to 0.01 for finer control
        slider.value = value;
        container.appendChild(slider);

        this.uiContainer.appendChild(container);

        slider.addEventListener('input', (event) => {
            valueElement.innerText = event.target.value;
            //console.log(`${label} value:`, event.target.value);
            // Add your processing logic here
        });

        // Store the slider reference for later use
        this[id] = slider;
    }

    getSlider1() {
        return this.slider1.value;
    }

    getSlider2() {
        return this.slider2.value;
    }
    getWidth() {
        return this.canvas.width;
    }

    getHeight() {
        return this.canvas.height;
    }

    getMousePosition() {
        return this.mousePosition;
    }

    getMouseButtonLeft() {
        return this.mouseButtonLeft;        
    }
    getMouseButtonMiddle() {
        return this.mouseButtonMiddle;
    }
    getMouseButtonRight() {
        return this.mouseButtonRight;
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

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePosition.x = (event.clientX - rect.left);
        this.mousePosition.y = rect.height - (event.clientY - rect.top);
        this.Present.handleMouseMove(this.mousePosition);
    }
    handleMouseDown(event) {
        this.Present.handleMouseDown(event);
        if (event.button === 0) {
            console.log('Left mouse button down');
            this.mouseButtonLeft = 1;
        } else if (event.button === 1) {
            console.log('Middle mouse button down');
            this.mouseButtonMiddle = 1;
        } else if (event.button === 2) {
            console.log('Right mouse button down');
            this.mouseButtonRight = 1;
            this.Present.SWE.renderInit();
        }
    }

    handleMouseUp(event) {
        this.Present.handleMouseUp(event);
        if (event.button === 0) {
            console.log('Left mouse button up');
            this.mouseButtonLeft = 0;
        } else if (event.button === 1) {
            console.log('Middle mouse button up');
            this.mouseButtonMiddle = 0;
        } else if (event.button === 2) {
            console.log('Right mouse button up');
            this.mouseButtonRight = 0;
        }
    }

    resize() {
        const contentRect = this.webapp.getBoundingClientRect();

        let width = contentRect.width - 10;
        let height = contentRect.height - 10;

        // Limit the canvas size to a maximum of 1024x1024
        const maxSize = 1024;
        if (width > maxSize) {
            width = maxSize;
        }
        if (height > maxSize) {
            height = maxSize;
        }

        this.canvas.width = width;
        this.canvas.height = height;

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    render() {
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.frameCount++;

        if (deltaTime >= 1000) {
            const fps = (this.frameCount / deltaTime) * 1000;
            this.fpsDisplay.innerText = `FPS: ${fps.toFixed(2)}`;
            this.lastFrameTime = now;
            this.frameCount = 0;
        }

        this.Present.render();
        requestAnimationFrame(this.render.bind(this));
    }
}

const app = new WebGLApp();
export { app };

