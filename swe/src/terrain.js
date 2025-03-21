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
            [vsTerrain, fsTerrain, programTerrain],
            [vsTerrainShadow, fsTerrainShadow, programTerrainShadow],
            [vsTerrainSkirt, fsTerrainSkirt, programTerrainSkirt],
            [vsTerrainSkirtShadow, fsTerrainSkirtShadow, programTerrainSkirtShadow],
            [vsFogCube, fsFogCube, program_FogCube],
        ] = await Promise.all([
            createShaderProgram(this.gl, 'src/shaders/vsTerrain.glsl', 'src/shaders/psTerrain.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsTerrainShadow.glsl', 'src/shaders/psTerrainShadow.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsTerrainSkirt.glsl', 'src/shaders/psTerrainSkirt.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsTerrainSkirtShadow.glsl', 'src/shaders/psTerrainSkirtShadow.glsl'),
            createShaderProgram(this.gl, 'src/shaders/vsFogCube.glsl', 'src/shaders/psFogCube.glsl'),
        ]);

        this.programTerrain = programTerrain;
        this.programTerrainShadow = programTerrainShadow;
        this.programTerrainSkirt = programTerrainSkirt;
        this.programTerrainSkirtShadow = programTerrainSkirtShadow;
        this.programFogCube = program_FogCube;

        // Create the vertex and index buffers
        this.createBuffers();

        // Create the ortho and view matrices
        this.orthoMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.mvpMatrix = mat4.create();
        this.shadowMapMatrix = mat4.create();
        //this.fCamRotX = Math.PI / 4;
        //this.fCamRotZ = (Math.PI*5) / 6;
        this.fCamRotX = 0.0;
        this.fCamRotZ = Math.PI;

        this.createShadowMap();
    }

    createBuffers() {
        const width = app.Present.SWE.getWidth();
        const height = app.Present.SWE.getHeight();
        const verticesTerrain = [];
        const indicesTerrain = [];
        const verticesSkirt = [];
        const indicesSkirt = [];
        const stepX = 1.0 / width;
        const stepY = 1.0 / height;

        // 0.0 .. 0.99
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                verticesTerrain.push((x) * stepX, (y) * stepY, 0.0);
            }
        }

        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                const i = y * width + x;
                indicesTerrain.push(i +1, i, i + width);
                indicesTerrain.push(i + width + 1, i + 1, i + width);
            }
        }

        // Create skirt vertices
        const skirtHeight = 1.0; // Adjust the height of the skirt as needed

        //0,0
        for (let y = 0; y < height; y++) {
            verticesSkirt.push(0, (y) * stepY, skirtHeight, -1.0, 0.0); // Bottom vertex
            verticesSkirt.push(0, (y) * stepY, 0.0, -1.0, 0.0); // Top vertex            
        }
        //0,1

        //0,1
        for (let x = 0; x < width; x++) {
            verticesSkirt.push((x) * stepX, (height - 1) * stepY, skirtHeight, 0.0, 1.0); // Bottom vertex
            verticesSkirt.push((x) * stepX, (height - 1) * stepY, 0.0, 0.0, 1.0); // Top vertex            
        }
        //1,1

        //1,1
        for (let y = height-1; y >= 0; y--) {
            verticesSkirt.push((width - 1) * stepX, (y) * stepY, skirtHeight, 1.0, 0.0); // Bottom vertex
            verticesSkirt.push((width - 1) * stepX, (y) * stepY, 0.0, 1.0, 0.0); // Top vertex            
        }
        //1,0

        //1,0
        for (let x = width - 1; x >= 0; x--) {
            verticesSkirt.push((x) * stepX, 0, skirtHeight, 0.0, -1.0); // Bottom vertex
            verticesSkirt.push((x) * stepX, 0, 0.0, 0.0, -1.0); // Top vertex            
        }
        //0,0

        // Create skirt indices for TRIANGLE_STRIP
        for (let i = 0; i < verticesSkirt.length ; i++ ) {
            indicesSkirt.push(i);
        }

        this.vertexBufferTerrain = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferTerrain);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(verticesTerrain), this.gl.STATIC_DRAW);

        this.indexBufferTerrain = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferTerrain);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indicesTerrain), this.gl.STATIC_DRAW);

        this.vertexBufferSkirt = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferSkirt);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(verticesSkirt), this.gl.STATIC_DRAW);

        this.indexBufferSkirt = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferSkirt);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indicesSkirt), this.gl.STATIC_DRAW);

        this.indexCountTerrain = indicesTerrain.length;
        this.indexCountSkirt = indicesSkirt.length;

        // Create cube vertex and index buffers
        const cubeVertices = new Float32Array([
            // Positions
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,
            -1.0, 1.0, -1.0,
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,
        ]);

        const cubeIndices = new Uint16Array([
            0, 1, 2, 2, 3, 0, // Front
            1, 5, 6, 6, 2, 1, // Right
            5, 4, 7, 7, 6, 5, // Back
            4, 0, 3, 3, 7, 4, // Left
            3, 2, 6, 6, 7, 3, // Top
            4, 5, 1, 1, 0, 4  // Bottom
        ]);

        this.vertexBufferCube = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferCube);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, cubeVertices, this.gl.STATIC_DRAW);

        this.indexBufferCube = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferCube);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, cubeIndices, this.gl.STATIC_DRAW);

        this.indexCountCube = cubeIndices.length;
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
            //if (this.fCamRotX > Math.PI / 3) this.fCamRotX = Math.PI / 3;
            if (this.fCamRotX > Math.PI / 2) this.fCamRotX = Math.PI / 2;
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

    update() {
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

            this.mvpMatrixInv = mat4.create();
            mat4.invert(this.mvpMatrixInv, this.mvpMatrix);
        }

        {
            // Extract the view direction from the view matrix and normalize it
            this.viewDir = vec3.fromValues(this.viewMatrix[2], this.viewMatrix[6], this.viewMatrix[10]);
            vec3.normalize(this.viewDir, this.viewDir);

            this.vLightDir = vec3.fromValues(0.3, 1.0, 0.4);
            //this.vLightDir = vec3.fromValues(0.0, 1.0, 0.0);
            //vec3.rotateX(this.vLightDir, this.vLightDir, [0, 0, 0], app.getSlider1() * Math.PI);
            //vec3.rotateZ(this.vLightDir, this.vLightDir, [0, 0, 0], app.getSlider2() * Math.PI*2);
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

            const size = Math.sqrt(2) * 0.5;
            const lightProjectionMatrix = mat4.create();
            mat4.ortho(lightProjectionMatrix, -size, size, -size, size, -size, size); // Adjust near and far planes as needed

            mat4.multiply(this.shadowMapMatrix, lightProjectionMatrix, lightViewMatrix);
        }
    }

    renderShadow() {
        const gl = this.gl;

        // Render to the shadow map
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
        gl.viewport(0, 0, this.shadowMapSize, this.shadowMapSize);
        gl.enable(gl.DEPTH_TEST);

        //clear the shadowmap:
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        const cullFace = gl.getParameter(gl.CULL_FACE_MODE);
        gl.cullFace(gl.FRONT);

        // Render the scene from the light's perspective
        this.renderTerrainShadow();
        this.renderTerrainSkirtShadow();

        gl.cullFace(cullFace);

    }

    renderScene() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        this.renderTerrain();
        this.renderTerrainSkirt();
    }

    renderFog() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        this.renderFogCube();
    }

    renderTerrainShadow() {
        const gl = this.gl;
        const program = this.programTerrainShadow;

        // Use the shadow map shader program
        gl.useProgram(program);

        // Bind the vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferTerrain);
        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        // Bind the index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferTerrain);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'g_matVPShadow'), false, this.shadowMapMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, app.Present.SWE.getSWETex1());
        gl.uniform1i(gl.getUniformLocation(program, "g_tTex1"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, app.Present.SWE.getSWETex2());
        gl.uniform1i(gl.getUniformLocation(program, "g_tTex2"), 1);

        // Draw the grid
        gl.drawElements(gl.TRIANGLES, this.indexCountTerrain, gl.UNSIGNED_INT, 0);
    }

    renderTerrainSkirtShadow() {
        const gl = this.gl;
        const program = this.programTerrainSkirtShadow;

        // Use the shadow map shader program
        gl.useProgram(program);

        // Bind the vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferSkirt);
        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
        //const normalLocation = gl.getAttribLocation(program, 'normal');
        //gl.enableVertexAttribArray(normalLocation);
        //gl.vertexAttribPointer(normalLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
        // Bind the index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferSkirt);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'g_matVPShadow'), false, this.shadowMapMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, app.Present.SWE.getSWETex1());
        gl.uniform1i(gl.getUniformLocation(program, "g_tTex1"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, app.Present.SWE.getSWETex2());
        gl.uniform1i(gl.getUniformLocation(program, "g_tTex2"), 1);

        // Draw the grid
        gl.drawElements(gl.TRIANGLE_STRIP, this.indexCountSkirt, gl.UNSIGNED_INT, 0);
    }

    renderTerrain() {

        const gl = this.gl;
        const program = this.programTerrain;

        gl.useProgram(program);

        // Bind the vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferTerrain);
        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        // Bind the index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferTerrain);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'g_matVP'), false, this.mvpMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'g_matVPShadow'), false, this.shadowMapMatrix);

        gl.uniform3f(gl.getUniformLocation(program, "g_vViewDir"), this.viewDir[0], this.viewDir[1], this.viewDir[2]);
        gl.uniform3f(gl.getUniformLocation(program, "g_vLightDir"), this.vLightDir[0], this.vLightDir[1], this.vLightDir[2]);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, app.Present.SWE.getSWETex1());
        gl.uniform1i(gl.getUniformLocation(program, 'g_tTex1'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, app.Present.SWE.getSWETex2());
        gl.uniform1i(gl.getUniformLocation(program, 'g_tTex2'), 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, app.Present.SWE.getNormalTex());
        gl.uniform1i(gl.getUniformLocation(program, 'g_tTexNorm'), 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);
        gl.uniform1i(gl.getUniformLocation(program, 'g_tShadowMap'), 3);

        // Pass parameters to the fragment shader
        gl.uniform1f(gl.getUniformLocation(program, "g_fGridSizeInMeter"), app.Present.SWE.params.fGridSizeInMeter);
        gl.uniform1f(gl.getUniformLocation(program, "g_fElapsedTimeInSec"), app.Present.SWE.params.fElapsedTimeInSec);
        gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectSpeed"), app.Present.SWE.params.fAdvectSpeed);
        gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectDissipation"), app.Present.SWE.params.fAdvectDissipation);
        gl.uniform1f(gl.getUniformLocation(program, "g_fSandSlope"), app.Present.SWE.params.fSandSlope);
        gl.uniform1f(gl.getUniformLocation(program, "g_fSandFlow"), app.Present.SWE.params.fSandFlow);
        gl.uniform1f(gl.getUniformLocation(program, "g_fG"), app.Present.SWE.params.fG);
        gl.uniform1f(gl.getUniformLocation(program, "g_fHackBlurDepth"), app.Present.SWE.params.fHackBlurDepth);
        gl.uniform1i(gl.getUniformLocation(program, "g_iInitSetting"), app.Present.SWE.params.iInitSetting);

        // Draw the grid
        gl.drawElements(gl.TRIANGLES, this.indexCountTerrain, gl.UNSIGNED_INT, 0);
    }

    renderTerrainSkirt() {

        const gl = this.gl;
        const program = this.programTerrainSkirt;

        gl.useProgram(program);

        // Bind the vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferSkirt);
        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
        const normalLocation = gl.getAttribLocation(program, 'normal');
        gl.enableVertexAttribArray(normalLocation);
        gl.vertexAttribPointer(normalLocation, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
        // Bind the index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferSkirt);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'g_matVP'), false, this.mvpMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'g_matVPShadow'), false, this.shadowMapMatrix);

        gl.uniform3f(gl.getUniformLocation(program, "g_vViewDir"), this.viewDir[0], this.viewDir[1], this.viewDir[2]);
        gl.uniform3f(gl.getUniformLocation(program, "g_vLightDir"), this.vLightDir[0], this.vLightDir[1], this.vLightDir[2]);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, app.Present.SWE.getSWETex1());
        gl.uniform1i(gl.getUniformLocation(program, 'g_tTex1'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, app.Present.SWE.getSWETex2());
        gl.uniform1i(gl.getUniformLocation(program, 'g_tTex2'), 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, app.Present.SWE.getNormalTex());
        gl.uniform1i(gl.getUniformLocation(program, 'g_tTexNorm'), 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);
        gl.uniform1i(gl.getUniformLocation(program, 'g_tShadowMap'), 3);

        // Pass parameters to the fragment shader
        gl.uniform1f(gl.getUniformLocation(program, "g_fGridSizeInMeter"), app.Present.SWE.params.fGridSizeInMeter);
        gl.uniform1f(gl.getUniformLocation(program, "g_fElapsedTimeInSec"), app.Present.SWE.params.fElapsedTimeInSec);
        gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectSpeed"), app.Present.SWE.params.fAdvectSpeed);
        gl.uniform1f(gl.getUniformLocation(program, "g_fAdvectDissipation"), app.Present.SWE.params.fAdvectDissipation);
        gl.uniform1f(gl.getUniformLocation(program, "g_fSandSlope"), app.Present.SWE.params.fSandSlope);
        gl.uniform1f(gl.getUniformLocation(program, "g_fSandFlow"), app.Present.SWE.params.fSandFlow);
        gl.uniform1f(gl.getUniformLocation(program, "g_fG"), app.Present.SWE.params.fG);
        gl.uniform1f(gl.getUniformLocation(program, "g_fHackBlurDepth"), app.Present.SWE.params.fHackBlurDepth);
        gl.uniform1i(gl.getUniformLocation(program, "g_iInitSetting"), app.Present.SWE.params.iInitSetting);

        // Draw the grid
        gl.drawElements(gl.TRIANGLE_STRIP, this.indexCountSkirt, gl.UNSIGNED_INT, 0);
    }

    renderFogCube() {
        const gl = this.gl;
        const program = this.programFogCube;

        gl.useProgram(program);

        // Bind the vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferCube);
        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        // Bind the index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBufferCube);

        // Bind the textureMisc texture
        const textureMisc = app.Present.textureMisc;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureMisc);
        gl.uniform1i(gl.getUniformLocation(program, 'g_tTex1'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);
        gl.uniform1i(gl.getUniformLocation(program, 'g_tShadowMap'), 1);

        // Set the MVP matrix
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'g_matVP'), false, this.mvpMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'g_matVPInv'), false, this.mvpMatrixInv);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'g_matVPShadow'), false, this.shadowMapMatrix);

        // Draw the cube
        gl.drawElements(gl.TRIANGLES, this.indexCountCube, gl.UNSIGNED_SHORT, 0);
    }
}
