import { app } from './webglapp.js';
import { createShaderProgram } from './webglapp.js';
import * as mat4 from './dependencies/gl-matrix/esm/mat4.js';

export class Terrain {
    constructor(gl) {
        this.gl = gl;
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
    }

    createBuffers() {
        const width = app.Present.SWE.getWidth();
        const height = app.Present.SWE.getHeight();
        const vertices = [];
        const indices = [];
        const stepX = 1.0 / (width - 1);
        const stepY = 1.0 / (height - 1);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                vertices.push(x * stepX, y * stepY, 0.0);
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

    render() {
        this.gl.useProgram(this.program);

        // Bind the vertex buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        const positionLocation = this.gl.getAttribLocation(this.program, 'position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);

        // Bind the index buffer
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        const width = app.getWidth();
        const height = app.getHeight();
        const aspect = width / height;
        // Set up the ortho matrix to cover the entire plane
        //mat4.ortho(this.orthoMatrix, -width / 2, width / 2, -height / 2, height / 2, -1, 1);
        mat4.ortho(this.orthoMatrix, -aspect, aspect, 1, -1, -2, 2);
        // Set up the view matrix for an isometric view
        mat4.identity(this.viewMatrix);
        mat4.rotateX(this.viewMatrix, this.viewMatrix, Math.PI / 4); // Rotate 45 degrees around the X axis
        mat4.rotateZ(this.viewMatrix, this.viewMatrix, Math.PI / 6); // Rotate 45 degrees around the Y axis
        // Combine the ortho and view matrices into the MVP matrix
        mat4.multiply(this.mvpMatrix, this.orthoMatrix, this.viewMatrix);

        // Set the MVP matrix uniform
        const mvpMatrixLocation = this.gl.getUniformLocation(this.program, 'uMVPMatrix');
        this.gl.uniformMatrix4fv(mvpMatrixLocation, false, this.mvpMatrix);

        // Bind the SWE texture
        const texture = app.Present.SWE.getRenderTexture();
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uTexture'), 0);

        // Draw the grid
        this.gl.drawElements(this.gl.TRIANGLES, this.indexCount, this.gl.UNSIGNED_INT, 0);
    }
}