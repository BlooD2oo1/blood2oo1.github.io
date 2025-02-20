import { app } from './webglapp.js';
import { createShaderProgram } from './webglapp.js';
import * as mat4 from './dependencies/gl-matrix/esm/mat4.js';
import * as vec3 from './dependencies/gl-matrix/esm/vec3.js';
import * as vec4 from './dependencies/gl-matrix/esm/vec4.js';


export class SWE {
    constructor(gl) {
        this.gl = gl;
        this.width = 512;
        this.height = 512;

        this.params = {
            fGridSizeInMeter: 5.0,
            fElapsedTimeInSec: 0.5,
            fAdvectSpeed: -1.0,
            fG: 10.0,
            fHackBlurDepth: 1.0
        };
    }

    async init() {

        const [
            [vs_passInit, ps_passInit, program_passInit],
                [vs_pass01, ps_pass01, program_pass01],
                [vs_pass02, ps_pass02, program_pass02],
                [vs_pass03, ps_pass03, program_pass03],
                [vs_proc01, ps_proc01, program_proc01],
        ] = await Promise.all([
            createShaderProgram(this.gl, 'src/shaders/vsSWE.glsl', 'src/shaders/psSWEInit.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsSWE.glsl', 'src/shaders/psSWEPass01.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsSWE.glsl', 'src/shaders/psSWEPass02.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsSWE.glsl', 'src/shaders/psSWEPass03.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsSWE.glsl', 'src/shaders/psSWEProc01.glsl')
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
        this.currentTexture = this.createTextureAndFramebuffer(this.gl, this.currentFramebuffer, this.width, this.height );

        // Create the second framebuffer and texture
        this.otherFramebuffer = this.gl.createFramebuffer();
        this.otherTexture = this.createTextureAndFramebuffer(this.gl, this.otherFramebuffer, this.width, this.height);

        // Create the second framebuffer and texture
        this.rtFramebufferNorm = this.gl.createFramebuffer();
        this.rtTextureNorm = this.createTextureAndFramebuffer(this.gl, this.rtFramebufferNorm, this.width, this.height);

        this.renderInit();
    }

    createTextureAndFramebuffer(gl, framebuffer, width, height) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer is not complete:', status.toString(16));
        }

        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return texture;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getSWETex() {
        return this.otherTexture;
    }

    getNormalTex() {
        return this.rtTextureNorm;
    }

    renderInit() {
        // Bind the current framebuffer and set the viewport
        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.otherFramebuffer);
        // Render to the framebuffer
        this.gl.useProgram(this.program_SWEPassInit);
        this.gl.bindVertexArray(this.vao);
        this.gl.uniform2f(this.gl.getUniformLocation(this.program_SWEPassInit, "g_vRTRes"), this.getWidth(), this.getHeight());

        // Pass parameters to the fragment shader
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPassInit, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPassInit, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPassInit, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPassInit, "g_fG"), this.params.fG);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPassInit, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        // Unbind the framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
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
        // Bind the current framebuffer and set the viewport
        
        this.gl.viewport(0, 0, this.width, this.height);

        for (let i = 0; i < 50; i++) {
            // Pass 01
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.currentFramebuffer);
            this.gl.useProgram(this.program_SWEPass01);
            this.gl.bindVertexArray(this.vao);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.otherTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.program_SWEPass01, "g_tTex"), 0);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.uniform2f(this.gl.getUniformLocation(this.program_SWEPass01, "g_vRTRes"), this.getWidth(), this.getHeight());

            // Pass parameters to the fragment shader
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass01, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass01, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass01, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass01, "g_fG"), this.params.fG);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass01, "g_fHackBlurDepth"), this.params.fHackBlurDepth);

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

            this.gl.uniform2f(this.gl.getUniformLocation(this.program_SWEPass01, "uClickPosition"), clickPosition.x, clickPosition.y);
            this.gl.uniform2i(this.gl.getUniformLocation(this.program_SWEPass01, "uMouseButtons"), app.getMouseButtonLeft(), app.getMouseButtonRight());

            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
            [this.currentFramebuffer, this.otherFramebuffer] = [this.otherFramebuffer, this.currentFramebuffer];
            [this.currentTexture, this.otherTexture] = [this.otherTexture, this.currentTexture];

            // Pass 02
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.currentFramebuffer);
            this.gl.useProgram(this.program_SWEPass02);
            this.gl.bindVertexArray(this.vao);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.otherTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.program_SWEPass02, "g_tTex"), 0);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.uniform2f(this.gl.getUniformLocation(this.program_SWEPass02, "g_vRTRes"), this.getWidth(), this.getHeight());

            // Pass parameters to the fragment shader
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass02, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass02, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass02, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass02, "g_fG"), this.params.fG);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass02, "g_fHackBlurDepth"), this.params.fHackBlurDepth);

            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
            [this.currentFramebuffer, this.otherFramebuffer] = [this.otherFramebuffer, this.currentFramebuffer];
            [this.currentTexture, this.otherTexture] = [this.otherTexture, this.currentTexture];

            // Pass 03
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.currentFramebuffer);
            this.gl.useProgram(this.program_SWEPass03);
            this.gl.bindVertexArray(this.vao);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.otherTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.program_SWEPass03, "g_tTex"), 0);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.uniform2f(this.gl.getUniformLocation(this.program_SWEPass03, "g_vRTRes"), this.getWidth(), this.getHeight());

            // Pass parameters to the fragment shader
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass03, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass03, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass03, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass03, "g_fG"), this.params.fG);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEPass03, "g_fHackBlurDepth"), this.params.fHackBlurDepth);

            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
            [this.currentFramebuffer, this.otherFramebuffer] = [this.otherFramebuffer, this.currentFramebuffer];
            [this.currentTexture, this.otherTexture] = [this.otherTexture, this.currentTexture];
        }

        // Proc 01
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rtFramebufferNorm);
        this.gl.useProgram(this.program_SWEProc01);
        this.gl.bindVertexArray(this.vao);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.otherTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program_SWEProc01, "g_tTex"), 0);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.uniform2f(this.gl.getUniformLocation(this.program_SWEProc01, "g_vRTRes"), this.getWidth(), this.getHeight());

        // Pass parameters to the fragment shader
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEProc01, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEProc01, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEProc01, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEProc01, "g_fG"), this.params.fG);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_SWEProc01, "g_fHackBlurDepth"), this.params.fHackBlurDepth);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // Unbind the framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
}
