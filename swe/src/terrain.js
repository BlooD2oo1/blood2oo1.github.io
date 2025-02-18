import { app } from './webglapp.js';
import { createShaderProgram } from './webglapp.js';
import * as mat4 from './dependencies/gl-matrix/esm/mat4.js';
import * as vec3 from './dependencies/gl-matrix/esm/vec3.js';

export class Terrain {
    constructor(gl) {
        this.gl = gl;
        this.mousePosition = { x: 0, y: 0 };
        this.shadowMapSize = 2048;
    }

    async init() {
        // Load the shader program
        const [
            [vs, fs, program],
            [vsShadow, fsShadow, programShadow],
        ] = await Promise.all([
            createShaderProgram(this.gl, 'src/shaders/vsTerrain.glsl', 'src/shaders/psTerrain.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsTerrainShadow.glsl', 'src/shaders/psTerrainShadow.glsl')
        ]);

        this.program = program;
        this.programShadow = programShadow;

        // Create the vertex and index buffers
        this.createBuffers();

        // Create the ortho and view matrices
        this.orthoMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.mvpMatrix = mat4.create();
        this.shadowMapMatrix = mat4.create();
        this.fCamRotX = Math.PI / 4;
        this.fCamRotZ = Math.PI / 6;

        this.createShadowMap();
    }

    createBuffers() {
        const width = app.Present.SWE.getWidth();
        const height = app.Present.SWE.getHeight();
        const vertices = [];
        const indices = [];
        const stepX = 1.0 / width;
        const stepY = 1.0 / height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                vertices.push((x + 0.5) * stepX, (y + 0.5) * stepY, 0.0);
            }
        }

        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                const i = y * width + x;
                indices.push(i, i + 1, i + width);
                indices.push(i + 1, i + width + 1, i + width);
            }
        }

        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

        this.indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), this.gl.STATIC_DRAW);

        this.indexCount = indices.length;
    }

    createShadowMap() {
        const gl = this.gl;

        // Create the depth texture
        this.shadowMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, this.shadowMapSize, this.shadowMapSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Create the framebuffer
        this.shadowFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowMap, 0);

        // Unbind the framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    handleMouseMove(mousePosition) {
        if (this.mouseButtonMiddle === 1) {
            this.fCamRotX += (mousePosition.y - this.mousePosition.y) * 0.002;
            this.fCamRotZ -= (mousePosition.x - this.mousePosition.x) * 0.002;

            //limit the rotation:
            if (this.fCamRotX < 0) this.fCamRotX = 0;
            if (this.fCamRotX > Math.PI / 3) this.fCamRotX = Math.PI / 3;
            if (this.fCamRotZ > 2 * Math.PI) this.fCamRotZ -= 2 * Math.PI;
            if (this.fCamRotZ < 0) this.fCamRotZ += 2 * Math.PI;
        }
        this.mousePosition = { ...mousePosition };
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

        {
            const width = app.getWidth();
            const height = app.getHeight();
            const aspect = width / height;
            // Set up the ortho matrix to cover the entire plane
            const zoom = 0.6;
            mat4.ortho(this.orthoMatrix, -aspect * zoom, aspect * zoom, zoom, -zoom, -2, 2);
            // Set up the view matrix for an isometric view
            mat4.identity(this.viewMatrix);
            mat4.rotateX(this.viewMatrix, this.viewMatrix, this.fCamRotX); // 45 degrees
            mat4.rotateZ(this.viewMatrix, this.viewMatrix, this.fCamRotZ); // 30 degrees
            // Combine the ortho and view matrices into the MVP matrix
            mat4.multiply(this.mvpMatrix, this.orthoMatrix, this.viewMatrix);
        }

        {
            // Extract the view direction from the view matrix and normalize it
            this.viewDir = vec3.fromValues(this.viewMatrix[2], this.viewMatrix[6], this.viewMatrix[10]);
            vec3.normalize(this.viewDir, this.viewDir);

            this.vLightDir = vec3.fromValues(0.0, 1.0, 0.4);
            //vec3.rotateZ(this.vLightDir, this.vLightDir, [0, 0, 0], -this.fCamRotZ + Math.PI / 15 + Math.PI);
            //vec3.rotateX(vLightDir, vLightDir, [0, 0, 0], app.getSlider1() * Math.PI);
            //vec3.rotateZ(vLightDir, vLightDir, [0, 0, 0], app.getSlider2() * Math.PI*2);
            vec3.normalize(this.vLightDir, this.vLightDir);
        }

        {
            // calculate shadow map matrix:

            const lightViewMatrix = mat4.create();
            //mat4.lookAt(lightViewMatrix, vec3.fromValues(0, 0, 0), this.vLightDir, [0,0,1]);
            mat4.lookAt(lightViewMatrix, vec3.fromValues(0, 0, 0), vec3.scale(vec3.create(), this.vLightDir, -1), [0, 0, 1]);
            //const vLightDir = [-this.vLightDir[0], -this.vLightDir[1], -this.vLightDir[2]];
            //mat4.lookAt(lightViewMatrix, vec3.fromValues(0, 0, 0), vLightDir, [0, 0, 1]);
            //mat4.lookAt(lightViewMatrix, vec3.scale(vec3.create(), this.vLightDir, -1), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, 1));

            const size = Math.sqrt(2)*0.5;
            const lightProjectionMatrix = mat4.create();
            mat4.ortho(lightProjectionMatrix, -size, size, -size, size, -size, size); // Adjust near and far planes as needed

            mat4.multiply(this.shadowMapMatrix, lightProjectionMatrix, lightViewMatrix);
        }

        // Render to the shadow map
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
        gl.viewport(0, 0, this.shadowMapSize, this.shadowMapSize);
        //gl.clear(gl.DEPTH_BUFFER_BIT);


        //clear the shadowmap:
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        // Render the scene from the light's perspective
        this.renderShadowMap();

        // Render the scene normally
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, app.getWidth(), app.getHeight());
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Use the shadow map in the shader
        this.renderScene();

    }

    renderShadowMap() {
        const gl = this.gl;

        // Use the shadow map shader program
        gl.useProgram(this.programShadow);

        // Bind the vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        const positionLocation = gl.getAttribLocation(this.programShadow, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        // Bind the index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Set the shadow map matrix uniform
        gl.uniformMatrix4fv(gl.getUniformLocation(this.programShadow, 'uShadowMapMatrix'), false, this.shadowMapMatrix);

        // Bind the SWE texture
        const texture = app.Present.SWE.getSWETex();
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.programShadow, 'uTexture'), 0);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);

        // Draw the grid
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    }

    renderScene() {

        const gl = this.gl;

        this.gl.useProgram(this.program);

        // Bind the vertex buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        const positionLocation = this.gl.getAttribLocation(this.program, 'position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);

        // Bind the index buffer
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Set the MVP matrix uniform
        this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, 'uMVPMatrix'), false, this.mvpMatrix);
        this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, 'uShadowMapMatrix'), false, this.shadowMapMatrix);

        this.gl.uniform3f(this.gl.getUniformLocation(this.program, "g_vViewDir"), this.viewDir[0], this.viewDir[1], this.viewDir[2]);
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, "g_vLightDir"), this.vLightDir[0], this.vLightDir[1], this.vLightDir[2]);

        // Bind the SWE texture
        const texture = app.Present.SWE.getSWETex();
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uTexture'), 0);

        // Bind the SWETex texture
        const texture2 = app.Present.SWE.getNormalTex();
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture2);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uTexNorm'), 1);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.shadowMap);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uShadowMap'), 2);

        this.gl.uniform2f(this.gl.getUniformLocation(this.program, "uRTRes"), app.Present.SWE.getWidth(), app.Present.SWE.getHeight());

        // Pass parameters to the fragment shader
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, "g_fGridSizeInMeter"), app.Present.SWE.params.fGridSizeInMeter);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, "g_fElapsedTimeInSec"), app.Present.SWE.params.fElapsedTimeInSec);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, "g_fAdvectSpeed"), app.Present.SWE.params.fAdvectSpeed);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, "g_fG"), app.Present.SWE.params.fG);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, "g_fHackBlurDepth"), app.Present.SWE.params.fHackBlurDepth);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CW);

        // Draw the grid
        this.gl.drawElements(this.gl.TRIANGLES, this.indexCount, this.gl.UNSIGNED_INT, 0);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
    }
}
