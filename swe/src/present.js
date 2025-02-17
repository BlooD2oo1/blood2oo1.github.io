import { app } from './webglapp.js';
import { createShaderProgram } from './webglapp.js';
import { SWE } from './swe.js';
import { Terrain } from './terrain.js';

export class Present {
    constructor(gl) {
        this.gl = gl;
        this.SWE = new SWE(this.gl);
        this.Terrain = new Terrain(this.gl);
        this.counter = 0;
    }

    async init() {

        const [[vs, ps, program] ] = await Promise.all([
            createShaderProgram(this.gl, 'src/shaders/vsPresent.glsl', 'src/shaders/psPresent.glsl'),
            this.SWE.init(),
            this.Terrain.init()
        ]);

        this.program_Present = program;
        this.VS_Present = vs;
        this.PS_Present = ps;

        const quadVertices = new Float32Array([
            // Positions   // TexCoords
            -1, -1, 0, 0,
            1, -1, 1, 0,
            -1, 1, 0, 1,
            -1, 1, 0, 1,
            1, -1, 1, 0,
            1, 1, 1, 1
        ]);

        this.screenVao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.screenVao);

        this.screenVbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.screenVbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program_Present, "position");
        const texCoordLocation = this.gl.getAttribLocation(this.program_Present, "texCoord");

        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);

        this.gl.enableVertexAttribArray(texCoordLocation);
        this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
    }

    handleMouseMove(mousePosition) {
        this.SWE.handleMouseMove(mousePosition);
        this.Terrain.handleMouseMove(mousePosition);
    }
    handleMouseDown(event) {
        this.SWE.handleMouseDown(event);
        this.Terrain.handleMouseDown(event);
        if (event.button === 0) {
            this.mouseButtonLeft = 1;
        } else if (event.button === 1) {
            this.mouseButtonMiddle = 1;
        } else if (event.button === 2) {
            this.mouseButtonRight = 1;
        }
    }
    handleMouseUp(event) {
        this.SWE.handleMouseUp(event);
        this.Terrain.handleMouseUp(event);
        if (event.button === 0) {
            this.mouseButtonLeft = 0;
        } else if (event.button === 1) {
            this.mouseButtonMiddle = 0;
        } else if (event.button === 2) {
            this.mouseButtonRight = 0;
        }
    }

    render() {

        this.SWE.render();

        //set the viewport to the size of the canvas
        this.gl.viewport(0, 0, app.getWidth(), app.getHeight());
        // Render the framebuffer texture to the screen
        this.gl.clearColor(0.0, 0.2, 0.3, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program_Present);
        this.gl.bindVertexArray(this.screenVao);

        const texture = this.SWE.getSWETex();
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program_Present, "uTexture"), 0);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        // Pass mouse position to the fragment shader
        const mousePosition = app.getMousePosition();
        this.gl.uniform2f(this.gl.getUniformLocation(this.program_Present, "uMousePosition"), mousePosition.x, mousePosition.y);

        //fSlider1, fSlider1:
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_Present, "fSlider1"), app.getSlider1());
        this.gl.uniform1f(this.gl.getUniformLocation(this.program_Present, "fSlider2"), app.getSlider2());

        // create vec2 shader input for SWE width height:
        this.gl.uniform2f(this.gl.getUniformLocation(this.program_Present, "uRTRes"), app.getWidth(), app.getHeight());

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // Render the terrain every 100 frames
        this.counter++;
        if (this.counter > 20) {
            const currentProgram = this.gl.getParameter(this.gl.CURRENT_PROGRAM);
            const currentVAO = this.gl.getParameter(this.gl.VERTEX_ARRAY_BINDING);
            const currentFramebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
            const currentViewport = this.gl.getParameter(this.gl.VIEWPORT);

            // Render the terrain
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.depthFunc(this.gl.LEQUAL);
            this.Terrain.render();
            this.gl.disable(this.gl.DEPTH_TEST);

            // Restore previous WebGL state
            this.gl.useProgram(currentProgram);
            this.gl.bindVertexArray(currentVAO);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, currentFramebuffer);
            this.gl.viewport(currentViewport[0], currentViewport[1], currentViewport[2], currentViewport[3]);
        }
    }
}

