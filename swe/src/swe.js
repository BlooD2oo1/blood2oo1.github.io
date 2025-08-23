import { app } from './webglapp.js';
import { createShaderProgram } from './webglapp.js';
import * as mat4 from './dependencies/gl-matrix/esm/mat4.js';
import * as vec3 from './dependencies/gl-matrix/esm/vec3.js';
import * as vec4 from './dependencies/gl-matrix/esm/vec4.js';


export class SWE {
	constructor(gl) {
		this.gl = gl;
		this.width = 1024;
		this.height = 1024;

		this.params = {
			fGridSizeInMeter: 5.0,
			fElapsedTimeInSec: 0.5,
            fAdvectSpeed: 1.0,
            fAdvectDissipation: 0.9998,
            fSandSlope: 0.00002,
            fSandFlow: 0.002,
			fG: 9.8,
			fHackBlurDepth: 1.0,
			iInitSetting: 0,
		};
	}

	async init() {
		const gl = this.gl;
		const [
			[vs_passInit, ps_passInit, program_passInit],
			[vs_pass01, ps_pass01, program_pass01],
			[vs_pass02, ps_pass02, program_pass02],
			[vs_pass03, ps_pass03, program_pass03],
			[vs_proc01, ps_proc01, program_proc01],
		] = await Promise.all([
			createShaderProgram(gl, 'src/shaders/vsSWE.glsl', 'src/shaders/psSWEInit.glsl'),
			createShaderProgram(gl, 'src/shaders/vsSWE.glsl', 'src/shaders/psSWEPass01.glsl'),
			createShaderProgram(gl, 'src/shaders/vsSWE.glsl', 'src/shaders/psSWEPass02.glsl'),
			createShaderProgram(gl, 'src/shaders/vsSWE.glsl', 'src/shaders/psSWEPass03.glsl'),
			createShaderProgram(gl, 'src/shaders/vsSWE.glsl', 'src/shaders/psSWEProc01.glsl')
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

		this.program_SWEProc01 = program_proc01;
		this.VS_SWEProc01 = vs_proc01;
		this.PS_SWEProc01 = ps_proc01;

		const quadVertices = new Float32Array([
			-1, -1,
			1, -1,
			-1, 1,
			1, 1
		]);

		const quadIndices = new Uint16Array([
			0, 1, 2,
			2, 1, 3
		]);

		this.screenVbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
		gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

		this.screenIbo = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadIndices, gl.STATIC_DRAW);

		this.m_pTex1 = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.m_pTex1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		this.m_pTex1Temp = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.m_pTex1Temp);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		this.m_pTex2 = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.m_pTex2);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		this.m_pTex2Temp = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.m_pTex2Temp);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		this.m_pTexNorm = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.m_pTexNorm);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		this.m_pTex1FB = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTex1FB);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.m_pTex1, 0);
		gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

		this.m_pTex1FBTemp = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTex1FBTemp);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.m_pTex1Temp, 0);
		gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

		/*this.m_pTex2FB = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTex2FB);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.m_pTex2, 0);
		gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

		this.m_pTex2FBTemp = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTex2FBTemp);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.m_pTex2Temp, 0);
		gl.drawBuffers([gl.COLOR_ATTACHMENT0]);*/

		this.m_pTex12FB = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTex12FB);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.m_pTex1, 0);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.m_pTex2, 0);
		gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

		this.m_pTex12FBTemp = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTex12FBTemp);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.m_pTex1Temp, 0);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.m_pTex2Temp, 0);
		gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

		this.m_pTexFBNorm = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTexFBNorm);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.m_pTexNorm, 0);
		gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

		this.renderInit();
	}

	getWidth() {
		return this.width;
	}

	getHeight() {
		return this.height;
	}

	getSWETex1() {
		return this.m_pTex1Temp;
	}

	getSWETex2() {
		return this.m_pTex2Temp;
	}

	getNormalTex() {
		return this.m_pTexNorm;
	}

	renderInit() {
		const gl = this.gl;

        this.m_iFrameCount = 0;

        const program = this.program_SWEPassInit;

		// Bind the current framebuffer and set the viewport
		gl.viewport(0, 0, this.width, this.height);
		gl.disable(gl.DEPTH_TEST);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTex12FBTemp);
		// Render to the framebuffer
        gl.useProgram(program);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
        const positionLocation = gl.getAttribLocation(program, "position");
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(gl.getUniformLocation(program, "g_vRTRes"), this.getWidth(), this.getHeight());

		// Pass parameters to the fragment shader
		gl.uniform1f(gl.getUniformLocation(program, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
		gl.uniform1f(gl.getUniformLocation(program, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
        gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
        gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectDissipation"), this.params.fAdvectDissipation);
        gl.uniform1f(gl.getUniformLocation(program, "g_fSandSlope"), this.params.fSandSlope);
        gl.uniform1f(gl.getUniformLocation(program, "g_fSandFlow"), this.params.fSandFlow);
		gl.uniform1f(gl.getUniformLocation(program, "g_fG"), this.params.fG);
		gl.uniform1f(gl.getUniformLocation(program, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
        gl.uniform1i(gl.getUniformLocation(program, "g_iInitSetting"), this.params.iInitSetting);
		console.log(this.params.iInitSetting);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
		// Unbind the framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	handleMouseMove(mousePosition) {
	}
	handleMouseDown(event) {
		if (event.button === 0) {
			this.mouseButtonLeft = 1;
		} else if (event.button === 1) {
			this.mouseButtonMiddle = 1;
		} else if (event.button === 2) {
			this.mouseButtonRight = 1;
		}
	}
	handleMouseUp(event) {
		if (event.button === 0) {
			this.mouseButtonLeft = 0;
		} else if (event.button === 1) {
			this.mouseButtonMiddle = 0;
		} else if (event.button === 2) {
			this.mouseButtonRight = 0;
		}
	}

	render() {


        this.params.fAdvectSpeed = app.getSliderVelAdvect();
        this.params.fAdvectDissipation = app.getSliderVelAdvectDissipation();
        this.params.fSandSlope = app.getSliderSandSlope();
        this.params.fSandFlow = app.getSliderSandFlow();
		this.params.fElapsedTimeInSec = app.getSliderTimeScale();
		this.params.fGridSizeInMeter = app.getSliderGridScale();


		const gl = this.gl;
		// Bind the current framebuffer and set the viewport        
		gl.viewport(0, 0, this.width, this.height);
		gl.disable(gl.DEPTH_TEST);

		for (let i = 0; i < app.getSliderSubStepCount(); i++) {

			this.m_iFrameCount++;

			// Pass 01
			{
				const program = this.program_SWEPass01;

				gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTex12FB);

				gl.useProgram(program);

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
				gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
				const positionLocation = gl.getAttribLocation(program, "position");
				gl.enableVertexAttribArray(positionLocation);
				gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, this.m_pTex1Temp);
				gl.uniform1i(gl.getUniformLocation(program, "g_tTex1"), 0);
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, this.m_pTex2Temp);
				gl.uniform1i(gl.getUniformLocation(program, "g_tTex2"), 1);

				gl.uniform2f(gl.getUniformLocation(program, "g_vRTRes"), this.getWidth(), this.getHeight());

				// Pass parameters to the fragment shader
				gl.uniform1f(gl.getUniformLocation(program, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
				gl.uniform1f(gl.getUniformLocation(program, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
                gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
                gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectDissipation"), this.params.fAdvectDissipation);
                gl.uniform1f(gl.getUniformLocation(program, "g_fSandSlope"), this.params.fSandSlope);
                gl.uniform1f(gl.getUniformLocation(program, "g_fSandFlow"), this.params.fSandFlow);
				gl.uniform1f(gl.getUniformLocation(program, "g_fG"), this.params.fG);
				gl.uniform1f(gl.getUniformLocation(program, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
				gl.uniform1i(gl.getUniformLocation(program, "g_iInitSetting"), this.params.iInitSetting);

                gl.uniform1f(gl.getUniformLocation(program, "g_fRndSeed"), Math.random());
				gl.uniform1i(gl.getUniformLocation(program, "g_iSWEFrameCount"), this.m_iFrameCount);

				{
					// Pass mouse position to the fragment shader
					const mousePosition = app.getMousePosition();
					const matMVP = app.Present.Terrain.mvpMatrix;

					// Convert mouse position to NDC
					const ndcX = (mousePosition.x / app.getWidth()) * 2 - 1;
					const ndcY = ((mousePosition.y / app.getHeight()) * 2 - 1); // Flip Y coordinate

					// Create NDC ray
					const rayStartNDC = vec4.fromValues(ndcX, ndcY, -1, 1);
					const rayEndNDC = vec4.fromValues(ndcX, ndcY, 1, 1);

					// Inverse MVP matrix
					const invMVP = mat4.create();
					mat4.invert(invMVP, matMVP);

					// Transform NDC ray to world coordinates
					const rayStartWorld = vec4.create();
					const rayEndWorld = vec4.create();
					vec4.transformMat4(rayStartWorld, rayStartNDC, invMVP);
					vec4.transformMat4(rayEndWorld, rayEndNDC, invMVP);

					// Convert homogeneous coordinates to 3D coordinates
					vec3.scale(rayStartWorld, rayStartWorld, 1 / rayStartWorld[3]);
					vec3.scale(rayEndWorld, rayEndWorld, 1 / rayEndWorld[3]);

					// Calculate ray direction
					const rayDirWorld = vec3.create();
					vec3.subtract(rayDirWorld, rayEndWorld, rayStartWorld);
					vec3.normalize(rayDirWorld, rayDirWorld);

					// Calculate intersection with XY plane (z = 0)
					const t = -rayStartWorld[2] / rayDirWorld[2];
					const intersection = vec3.create();
					vec3.scaleAndAdd(intersection, rayStartWorld, rayDirWorld, t);

					// Convert world coordinates to texture UV coordinates
					const clickPosition = {
						x: (intersection[0] + 0.5),
						y: (intersection[1] + 0.5)
					};

					gl.uniform2f(gl.getUniformLocation(program, "g_vGizmo_ClickPosition"), clickPosition.x, clickPosition.y);
					let iMaterialType = 0;
					if (app.getMouseButtonLeft() === 1) {
						iMaterialType = app.getGizmoMaterial();
					}
					gl.uniform1i(gl.getUniformLocation(program, "g_iGizmo_MaterialType"), iMaterialType);
					gl.uniform1f(gl.getUniformLocation(program, "g_fGizmo_Amount"), app.getSliderGizmoAmount() * 0.0001);
					gl.uniform1f(gl.getUniformLocation(program, "g_fGizmo_Radius"), app.getSliderGizmoRadius());

					gl.uniform1f(gl.getUniformLocation(program, "g_fEmitter_Source"), app.getSliderEmitterSource() * 0.0001);
					gl.uniform1f(gl.getUniformLocation(program, "g_fEmitter_Drain"), app.getSliderEmitterDrain() * 0.0001);
				}

				gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

				[this.m_pTex1, this.m_pTex1Temp] = [this.m_pTex1Temp, this.m_pTex1];
				[this.m_pTex2, this.m_pTex2Temp] = [this.m_pTex2Temp, this.m_pTex2];
				[this.m_pTex1FB, this.m_pTex1FBTemp] = [this.m_pTex1FBTemp, this.m_pTex1FB];
				[this.m_pTex2FB, this.m_pTex2FBTemp] = [this.m_pTex2FBTemp, this.m_pTex2FB];
				[this.m_pTex12FB, this.m_pTex12FBTemp] = [this.m_pTex12FBTemp, this.m_pTex12FB];
			}

			// Pass 02
			{
				const program = this.program_SWEPass02;

				gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTex12FB);

				gl.useProgram(program);

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
				gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
				const positionLocation = gl.getAttribLocation(program, "position");
				gl.enableVertexAttribArray(positionLocation);
				gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, this.m_pTex1Temp);
				gl.uniform1i(gl.getUniformLocation(program, "g_tTex1"), 0);
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, this.m_pTex2Temp);
				gl.uniform1i(gl.getUniformLocation(program, "g_tTex2"), 1);

				gl.uniform2f(gl.getUniformLocation(program, "g_vRTRes"), this.getWidth(), this.getHeight());

				// Pass parameters to the fragment shader
				gl.uniform1f(gl.getUniformLocation(program, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
				gl.uniform1f(gl.getUniformLocation(program, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
                gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
                gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectDissipation"), this.params.fAdvectDissipation);
                gl.uniform1f(gl.getUniformLocation(program, "g_fSandSlope"), this.params.fSandSlope);
                gl.uniform1f(gl.getUniformLocation(program, "g_fSandFlow"), this.params.fSandFlow);
				gl.uniform1f(gl.getUniformLocation(program, "g_fG"), this.params.fG);
				gl.uniform1f(gl.getUniformLocation(program, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
				gl.uniform1i(gl.getUniformLocation(program, "g_iInitSetting"), this.params.iInitSetting);

				gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

				[this.m_pTex1, this.m_pTex1Temp] = [this.m_pTex1Temp, this.m_pTex1];
				[this.m_pTex2, this.m_pTex2Temp] = [this.m_pTex2Temp, this.m_pTex2];
				[this.m_pTex1FB, this.m_pTex1FBTemp] = [this.m_pTex1FBTemp, this.m_pTex1FB];
				[this.m_pTex2FB, this.m_pTex2FBTemp] = [this.m_pTex2FBTemp, this.m_pTex2FB];
				[this.m_pTex12FB, this.m_pTex12FBTemp] = [this.m_pTex12FBTemp, this.m_pTex12FB];
			}

			// Pass 03
			{

				const program = this.program_SWEPass03;

				gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTex12FB);

				gl.useProgram(program);

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
				gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
				const positionLocation = gl.getAttribLocation(program, "position");
				gl.enableVertexAttribArray(positionLocation);
				gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, this.m_pTex1Temp);
				gl.uniform1i(gl.getUniformLocation(program, "g_tTex1"), 0);
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, this.m_pTex2Temp);
				gl.uniform1i(gl.getUniformLocation(program, "g_tTex2"), 1);

				gl.uniform2f(gl.getUniformLocation(program, "g_vRTRes"), this.getWidth(), this.getHeight());

				// Pass parameters to the fragment shader
				gl.uniform1f(gl.getUniformLocation(program, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
				gl.uniform1f(gl.getUniformLocation(program, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
                gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
                gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectDissipation"), this.params.fAdvectDissipation);
                gl.uniform1f(gl.getUniformLocation(program, "g_fSandSlope"), this.params.fSandSlope);
                gl.uniform1f(gl.getUniformLocation(program, "g_fSandFlow"), this.params.fSandFlow);
				gl.uniform1f(gl.getUniformLocation(program, "g_fG"), this.params.fG);
				gl.uniform1f(gl.getUniformLocation(program, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
				gl.uniform1i(gl.getUniformLocation(program, "g_iInitSetting"), this.params.iInitSetting);

				gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

				[this.m_pTex1, this.m_pTex1Temp] = [this.m_pTex1Temp, this.m_pTex1];
				[this.m_pTex2, this.m_pTex2Temp] = [this.m_pTex2Temp, this.m_pTex2];
				[this.m_pTex1FB, this.m_pTex1FBTemp] = [this.m_pTex1FBTemp, this.m_pTex1FB];
				[this.m_pTex2FB, this.m_pTex2FBTemp] = [this.m_pTex2FBTemp, this.m_pTex2FB];
				[this.m_pTex12FB, this.m_pTex12FBTemp] = [this.m_pTex12FBTemp, this.m_pTex12FB];
			}
		}

		// Proc 01
		{

			const program = this.program_SWEProc01;

			gl.bindFramebuffer(gl.FRAMEBUFFER, this.m_pTexFBNorm);

			gl.useProgram(program);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
			const positionLocation = gl.getAttribLocation(program, "position");
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.m_pTex1Temp);
			gl.uniform1i(gl.getUniformLocation(program, "g_tTex1"), 0);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.m_pTex2Temp);
			gl.uniform1i(gl.getUniformLocation(program, "g_tTex2"), 1);

			gl.uniform2f(gl.getUniformLocation(program, "g_vRTRes"), this.getWidth(), this.getHeight());

			// Pass parameters to the fragment shader
			gl.uniform1f(gl.getUniformLocation(program, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
			gl.uniform1f(gl.getUniformLocation(program, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
            gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
            gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectDissipation"), this.params.fAdvectDissipation);
            gl.uniform1f(gl.getUniformLocation(program, "g_fSandSlope"), this.params.fSandSlope);
            gl.uniform1f(gl.getUniformLocation(program, "g_fSandFlow"), this.params.fSandFlow);
			gl.uniform1f(gl.getUniformLocation(program, "g_fG"), this.params.fG);
			gl.uniform1f(gl.getUniformLocation(program, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
			gl.uniform1i(gl.getUniformLocation(this.program_SWEProc01, "g_iInitSetting"), this.params.iInitSetting);

			gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
		}

		// Unbind the framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
}
