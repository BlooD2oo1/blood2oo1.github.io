import { app } from './webglapp.js';
import { createShaderProgram } from './webglapp.js';
import * as mat4 from './dependencies/gl-matrix/esm/mat4.js';
import * as vec3 from './dependencies/gl-matrix/esm/vec3.js';

export class Terrain {
    constructor(gl) {
        this.gl = gl;
        this.mousePosition = { x: 0, y: 0 };
    }

    async init() {
        // Load the shader program
        const [vs, fs, program] = await createShaderProgram(this.gl, 'src/shaders/vsTerrain.glsl', 'src/shaders/psTerrain.glsl');
        this.program = program;

        // Create the vertex and index buffers
        this.createBuffers();

        // Create the ortho and view matrices
        this.orthoMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.mvpMatrix = mat4.create();
        this.fCamRotX = Math.PI / 4;
        this.fCamRotZ = Math.PI / 6;
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

    getMWPMatrix() {
        return this.mvpMatrix;
    }

    render() {
        const width = app.getWidth();
        const height = app.getHeight();
        const aspect = width / height;
        // Set up the ortho matrix to cover the entire plane
        //mat4.ortho(this.orthoMatrix, -width / 2, width / 2, -height / 2, height / 2, -1, 1);
        const zoom = 0.5;
        mat4.ortho(this.orthoMatrix, -aspect * zoom, aspect * zoom, zoom, -zoom, -2, 2);
        // Set up the view matrix for an isometric view
        mat4.identity(this.viewMatrix);
        mat4.rotateX(this.viewMatrix, this.viewMatrix, this.fCamRotX);//45
        mat4.rotateZ(this.viewMatrix, this.viewMatrix, this.fCamRotZ);//30
        // Combine the ortho and view matrices into the MVP matrix
        mat4.multiply(this.mvpMatrix, this.orthoMatrix, this.viewMatrix);


        this.gl.useProgram(this.program);

        // Bind the vertex buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        const positionLocation = this.gl.getAttribLocation(this.program, 'position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);

        // Bind the index buffer
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Set the MVP matrix uniform
        const mvpMatrixLocation = this.gl.getUniformLocation(this.program, 'uMVPMatrix');
        this.gl.uniformMatrix4fv(mvpMatrixLocation, false, this.mvpMatrix);

        // Extract the view direction from the view matrix and normalize it
        const viewDir = vec3.fromValues(this.viewMatrix[8], -this.viewMatrix[9], this.viewMatrix[10]);
        vec3.normalize(viewDir, viewDir);
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, "g_vViewDir"), viewDir[0], viewDir[1], viewDir[2]);

        //g_vLightDir:
        // Extract the left vector from the view matrix and normalize it
        const vLightDir = vec3.fromValues(1.0, 0.0, app.getSlider2());
        //rotate around z axis:
        vec3.rotateZ(vLightDir, vLightDir, [0, 0, 0], -this.fCamRotZ + Math.PI * 2 * app.getSlider1());
        vec3.normalize(vLightDir, vLightDir);
        console.log(vec3.dot(vLightDir, viewDir));

        this.gl.uniform3f(this.gl.getUniformLocation(this.program, "g_vLightDir"), vLightDir[0], vLightDir[1], vLightDir[2]);

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

        this.gl.uniform2f(this.gl.getUniformLocation(this.program, "uRTRes"), app.Present.SWE.getWidth(), app.Present.SWE.getHeight());

        // Pass parameters to the fragment shader
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, "g_fGridSizeInMeter"), app.Present.SWE.params.fGridSizeInMeter);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, "g_fElapsedTimeInSec"), app.Present.SWE.params.fElapsedTimeInSec);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, "g_fAdvectSpeed"), app.Present.SWE.params.fAdvectSpeed);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, "g_fG"), app.Present.SWE.params.fG);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, "g_fHackBlurDepth"), app.Present.SWE.params.fHackBlurDepth);

        // Draw the grid
        this.gl.drawElements(this.gl.TRIANGLES, this.indexCount, this.gl.UNSIGNED_INT, 0);
    }
}