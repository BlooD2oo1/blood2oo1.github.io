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
            fAdvectSpeed: -1.0,
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

        // Create the first framebuffer and texture
        [this.currentTexture, this.currentFramebuffer] = this.createTextureAndFramebuffer(gl, this.width, this.height );

        // Create the second framebuffer and texture
        [this.otherTexture, this.otherFramebuffer] = this.createTextureAndFramebuffer(gl, this.width, this.height);

        // Create the second framebuffer and texture
        [this.rtTextureNorm, this.rtFramebufferNorm] = this.createTextureAndFramebuffer(gl, this.width, this.height);

        this.renderInit();
    }

    createTextureAndFramebuffer(gl, width, height) {
        const framebuffer = gl.createFramebuffer();
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

        return [texture, framebuffer];
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
        const gl = this.gl;
        // Bind the current framebuffer and set the viewport
        gl.viewport(0, 0, this.width, this.height);
        gl.disable(gl.DEPTH_TEST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.otherFramebuffer);
        // Render to the framebuffer
        gl.useProgram(this.program_SWEPassInit);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
        const positionLocation = gl.getAttribLocation(this.program_SWEPassInit, "position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);        

        gl.uniform2f(gl.getUniformLocation(this.program_SWEPassInit, "g_vRTRes"), this.getWidth(), this.getHeight());

        // Pass parameters to the fragment shader
        gl.uniform1f(gl.getUniformLocation(this.program_SWEPassInit, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
        gl.uniform1f(gl.getUniformLocation(this.program_SWEPassInit, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
        gl.uniform1f(gl.getUniformLocation(this.program_SWEPassInit, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
        gl.uniform1f(gl.getUniformLocation(this.program_SWEPassInit, "g_fG"), this.params.fG);
        gl.uniform1f(gl.getUniformLocation(this.program_SWEPassInit, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
        gl.uniform1i(gl.getUniformLocation(this.program_SWEPassInit, "g_iInitSetting"), this.params.iInitSetting);
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
        const gl = this.gl;
        // Bind the current framebuffer and set the viewport        
        gl.viewport(0, 0, this.width, this.height);
        gl.disable(gl.DEPTH_TEST);

        for (let i = 0; i < 20; i++) {
            // Pass 01
            {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.currentFramebuffer);
                gl.useProgram(this.program_SWEPass01);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
                const positionLocation = gl.getAttribLocation(this.program_SWEPass01, "position");
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);        

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.otherTexture);
                gl.uniform1i(gl.getUniformLocation(this.program_SWEPass01, "g_tTex"), 0);
                gl.uniform2f(gl.getUniformLocation(this.program_SWEPass01, "g_vRTRes"), this.getWidth(), this.getHeight());

                // Pass parameters to the fragment shader
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass01, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass01, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass01, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass01, "g_fG"), this.params.fG);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass01, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
                gl.uniform1i(gl.getUniformLocation(this.program_SWEPass01, "g_iInitSetting"), this.params.iInitSetting);

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

                gl.uniform2f(gl.getUniformLocation(this.program_SWEPass01, "uClickPosition"), clickPosition.x, clickPosition.y);
                gl.uniform2i(gl.getUniformLocation(this.program_SWEPass01, "uMouseButtons"), app.getMouseButtonLeft(), app.getMouseButtonRight());

                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

            }

            [this.currentFramebuffer, this.otherFramebuffer] =[this.otherFramebuffer, this.currentFramebuffer];
            [this.currentTexture, this.otherTexture] = [this.otherTexture, this.currentTexture];

            // Pass 02
            {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.currentFramebuffer);
                gl.useProgram(this.program_SWEPass02);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
                const positionLocation = gl.getAttribLocation(this.program_SWEPass02, "position");
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);        

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.otherTexture);
                gl.uniform1i(gl.getUniformLocation(this.program_SWEPass02, "g_tTex"), 0);
                gl.uniform2f(gl.getUniformLocation(this.program_SWEPass02, "g_vRTRes"), this.getWidth(), this.getHeight());

                // Pass parameters to the fragment shader
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass02, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass02, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass02, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass02, "g_fG"), this.params.fG);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass02, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
                gl.uniform1i(gl.getUniformLocation(this.program_SWEPass02, "g_iInitSetting"), this.params.iInitSetting);

                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            }

            [this.currentFramebuffer, this.otherFramebuffer] = [this.otherFramebuffer, this.currentFramebuffer];
            [this.currentTexture, this.otherTexture] = [this.otherTexture, this.currentTexture];

            // Pass 03
            {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.currentFramebuffer);
                gl.useProgram(this.program_SWEPass03);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
                const positionLocation = gl.getAttribLocation(this.program_SWEPass03, "position");
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);        

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.otherTexture);
                gl.uniform1i(gl.getUniformLocation(this.program_SWEPass03, "g_tTex"), 0);
                gl.uniform2f(gl.getUniformLocation(this.program_SWEPass03, "g_vRTRes"), this.getWidth(), this.getHeight());

                // Pass parameters to the fragment shader
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass03, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass03, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass03, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass03, "g_fG"), this.params.fG);
                gl.uniform1f(gl.getUniformLocation(this.program_SWEPass03, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
                gl.uniform1i(gl.getUniformLocation(this.program_SWEPass03, "g_iInitSetting"), this.params.iInitSetting);

                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            }

            [this.currentFramebuffer, this.otherFramebuffer] = [this.otherFramebuffer, this.currentFramebuffer];
            [this.currentTexture, this.otherTexture] = [this.otherTexture, this.currentTexture];
        }

        // Proc 01
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.rtFramebufferNorm);
            gl.useProgram(this.program_SWEProc01);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
            const positionLocation = gl.getAttribLocation(this.program_SWEProc01, "position");
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);        

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.otherTexture);
            gl.uniform1i(gl.getUniformLocation(this.program_SWEProc01, "g_tTex"), 0);
            gl.uniform2f(gl.getUniformLocation(this.program_SWEProc01, "g_vRTRes"), this.getWidth(), this.getHeight());

            // Pass parameters to the fragment shader
            gl.uniform1f(gl.getUniformLocation(this.program_SWEProc01, "g_fGridSizeInMeter"), this.params.fGridSizeInMeter);
            gl.uniform1f(gl.getUniformLocation(this.program_SWEProc01, "g_fElapsedTimeInSec"), this.params.fElapsedTimeInSec);
            gl.uniform1f(gl.getUniformLocation(this.program_SWEProc01, "g_fAdvectSpeed"), this.params.fAdvectSpeed);
            gl.uniform1f(gl.getUniformLocation(this.program_SWEProc01, "g_fG"), this.params.fG);
            gl.uniform1f(gl.getUniformLocation(this.program_SWEProc01, "g_fHackBlurDepth"), this.params.fHackBlurDepth);
            gl.uniform1i(gl.getUniformLocation(this.program_SWEProc01, "g_iInitSetting"), this.params.iInitSetting);

            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        }

        // Unbind the framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}
