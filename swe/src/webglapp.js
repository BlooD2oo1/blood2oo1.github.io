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

let globalsCache = null;
export async function createShaderProgram(gl, vsPath, fsPath) {
	const [vsSource, fsSource] = await Promise.all([
		loadShaderFile(vsPath),
		loadShaderFile(fsPath)
	]);

	if (!vsSource || !fsSource) {
		return null;
	}

	// Replace #GLOBALS with the content of globals
	const vsSourceWithGlobals = vsSource.replace('#GLOBALS', globalsCache);
	const fsSourceWithGlobals = fsSource.replace('#GLOBALS', globalsCache);

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

		this.gl = this.canvas.getContext("webgl2", { antialias: false });

		const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
		if (debugInfo) {
			const vendor = this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
			const renderer = this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
			console.log('Vendor:', vendor);
			console.log('Renderer:', renderer);
		} else {
			console.warn('WEBGL_debug_renderer_info extension not supported');
		}

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



		this.showLoadingMessage();

		this.Present = new Present(this.gl);

		this.init();

		this.lastFrameTime = performance.now();
		this.frameCount = 0;

		this.m_fTimeSec = 0.0;
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
		this.createButton('button1', 'TerrainPreset01', () => {
			this.Present.SWE.params.iInitSetting = 0;
			this.Present.SWE.renderInit();
		});

		this.createButton('button2', 'TerrainPreset02', () => {
			this.Present.SWE.params.iInitSetting = 1;
			this.Present.SWE.renderInit();
		});

		this.createButton('button2', 'TerrainPreset03', () => {
			this.Present.SWE.params.iInitSetting = 2;
			this.Present.SWE.renderInit();
		});

		// Create sliders with labels
		this.createSlider('SubStepCount', 'SubStepCount', 0, 100, 100, 1);
        this.createSlider('TimeScale', 'TimeScale', 0.01, 5.0, this.Present.SWE.params.fElapsedTimeInSec, 0.01);
        this.createSlider('GridScale', 'GridScale', 0.01, 10.0, this.Present.SWE.params.fGridSizeInMeter, 0.01);
        this.createSlider('VelAdvect', 'VelAdvect', -1.0, this.Present.SWE.params.fAdvectSpeed, 1.0);
        this.createSlider('VelAdvectDissipation', 'VelAdvectDissip.', 0.999, 1.0, this.Present.SWE.params.fAdvectDissipation, 0.000001);
        this.createSlider('SandSlope', 'SandSlope', 0.0, 0.00005, this.Present.SWE.params.fSandSlope, 0.0000001);
        this.createSlider('SandFlow', 'SandFlow', 0.0, 0.02, this.Present.SWE.params.fSandFlow, 0.0002);

		// Create FPS display
		this.fpsDisplay = document.createElement('div');
		this.fpsDisplay.id = 'fpsDisplay';
		this.fpsDisplay.innerText = 'FPS: 0';
		this.uiContainer.appendChild(this.fpsDisplay);

		// Create radio buttons for rock, sand, and water
		this.iGizmoMaterial = 3; // Default value
		this.createRadioButton('GizmoMaterial', 'rock', 'Rock', 1, 'iGizmoMaterial');
		this.createRadioButton('GizmoMaterial', 'sand', 'Sand', 2, 'iGizmoMaterial');
		this.createRadioButton('GizmoMaterial', 'water', 'Water', 3, 'iGizmoMaterial');
		this.createSlider('GizmoRadius', 'GizmoRadius', 0.001, 0.5, 0.5, 0.0001);
		this.createSlider('GizmoAmount', 'GizmoPower', -1.0, 1.0, -1.0, 0.001);
		this.createSlider('EmitterSource', 'Emitter Source', 0.0, 0.0001, 0.00001, 0.000001);
		this.createSlider('EmitterDrain', 'Emitter drain', 0.0, 0.0001, 0.00001, 0.000001);
	}

	createSlider(id, label, min, max, value, step = '0.01') {
		const container = document.createElement('div');
		container.className = 'ui-element-container';

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
		slider.step = step; // Set step to the provided value or default to 0.01
		slider.value = value;
		container.appendChild(slider);

		this.uiContainer.appendChild(container);

		slider.addEventListener('input', (event) => {
			valueElement.innerText = parseFloat(event.target.value).toFixed(6); // Format the value to 4 decimal places
			// Add your processing logic here
		});

		// Store the slider reference for later use
		this[id] = slider;
	}

	createButton(id, label, onClick) {
		const container = document.createElement('div');
		container.className = 'ui-element-container';

		const button = document.createElement('button');
		button.id = id;
		button.innerText = label;
		button.addEventListener('click', onClick);

		container.appendChild(button);
		this.uiContainer.appendChild(container);
	}


	createRadioButton(name, id, label, value, variableName) {
		const container = document.createElement('div');
		container.className = 'ui-element-container';

		const radio = document.createElement('input');
		radio.type = 'radio';
		radio.id = id;
		radio.name = name;
		radio.value = value;
		container.appendChild(radio);

		const labelElement = document.createElement('label');
		labelElement.htmlFor = id;
		labelElement.innerText = label;
		container.appendChild(labelElement);

		this.uiContainer.appendChild(container);

		radio.addEventListener('change', (event) => {
			if (event.target.checked) {
				this[variableName] = value;
				console.log(`Selected material: ${label}`);
			}
		});

		if (value === this[variableName]) {
			radio.checked = true;
			this[variableName] = value;
		}
	}

	getSliderVelAdvect() {
		return this.VelAdvect.value;
    }

    getSliderVelAdvectDissipation() {
        return this.VelAdvectDissipation.value;
    }

	getSliderTimeScale() {
		return this.TimeScale.value;
	}

	getSliderGridScale() {
		return this.GridScale.value;
	}

	getSliderSubStepCount() {
		return this.SubStepCount.value;
	}

	getSliderGizmoAmount() {
		return this.GizmoAmount.value;
	}

	getSliderGizmoRadius() {
		return this.GizmoRadius.value;
	}

	getSliderEmitterSource() {
		return this.EmitterSource.value;
	}

	getSliderEmitterDrain() {
		return this.EmitterDrain.value;
    }

    getSliderSandSlope() {
        return this.SandSlope.value;
    }

    getSliderSandFlow() {
        return this.SandFlow.value;
    }

	getGizmoMaterial() {
		return this.iGizmoMaterial;
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

	getTimeSec() {
		return this.m_fTimeSec;
	}

	async init() {

		globalsCache = await loadShaderFile('src/shaders/globals.glsl');

		await this.Present.init();

		console.log("All resources loaded, starting render loop.");
		this.hideLoadingMessage();
		this.createUIElements();
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
		this.m_fTimeSec += deltaTime / 1000.0;
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

