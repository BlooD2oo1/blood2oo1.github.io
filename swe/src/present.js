import { app } from './webglapp.js';
import { createShaderProgram } from './webglapp.js';
import { SWE } from './swe.js';
import { Terrain } from './terrain.js';

export class Present {
    constructor(gl) {
        this.gl = gl;
        this.SWE = new SWE(gl);
        this.Terrain = new Terrain(gl);
        this.counter = 0;
    }

    async init() {

        const gl = this.gl;
        const [[vs, ps, program] ] = await Promise.all([
            createShaderProgram(gl, 'src/shaders/vsPresent.glsl', 'src/shaders/psPresent.glsl'),
            this.SWE.init(),
            this.Terrain.init()
        ]);

        this.program_Present = program;
        this.VS_Present = vs;
        this.PS_Present = ps;

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

        {
            /*this.framebufferMSAA = gl.createFramebuffer();
            this.colorRenderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.colorRenderbuffer);
            gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 8, gl.RGBA32F, app.getWidth(), app.getHeight());

            this.renderbufferMSAA = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbufferMSAA);
            gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 8, gl.DEPTH_COMPONENT16, app.getWidth(), app.getHeight());

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferMSAA);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.colorRenderbuffer);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbufferMSAA);*/

            // Create framebuffer and textures
            this.framebufferSceneMisc = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferSceneMisc);

            // Create the first texture (this.textureScene)
            this.textureScene = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.textureScene);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, app.getWidth(), app.getHeight(), 0, gl.RGBA, gl.FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            

            // Create the second texture (this.textureMisc)
            this.textureMisc = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.textureMisc);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, app.getWidth(), app.getHeight(), 0, gl.RGBA, gl.FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // Create and attach depth buffer
            this.depthRenderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRenderbuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, app.getWidth(), app.getHeight());

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textureScene, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.textureMisc, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRenderbuffer);

            // Set the draw buffers
            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);




            // Create the second framebuffer and attach textureScene and depthRenderbuffer
            this.framebufferScene = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferScene);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textureScene, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRenderbuffer);

            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                console.error('Framebuffer is not complete:', status.toString(16));
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
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
        const gl = this.gl;

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        gl.depthFunc(this.gl.LEQUAL);

        this.SWE.render();
        this.Terrain.update();
        this.Terrain.renderShadow();

        // Bind the multi-sampled framebuffer and set the viewport
        //gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferMSAA);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferSceneMisc);
        gl.viewport(0, 0, app.getWidth(), app.getHeight());
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
        this.Terrain.renderScene();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferScene);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.Terrain.renderFog();
        gl.disable(gl.BLEND);

        // Resolve the multi-sampled framebuffer to the resolve framebuffer
        //gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.framebufferMSAA);
        //gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.framebufferScene);
        //gl.blitFramebuffer(0, 0, app.getWidth(), app.getHeight(), 0, 0, app.getWidth(), app.getHeight(), gl.COLOR_BUFFER_BIT, gl.LINEAR);

        // Set the default framebuffer (screen) and viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, app.getWidth(), app.getHeight());
        gl.disable(gl.DEPTH_TEST);

        // Render the resolved texture to the screen
        gl.useProgram(this.program_Present);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.screenIbo);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.screenVbo);
        const positionLocation = gl.getAttribLocation(this.program_Present, "position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textureScene);
        gl.uniform1i(gl.getUniformLocation(this.program_Present, "g_tTex1"), 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Pass mouse position to the fragment shader
        const mousePosition = app.getMousePosition();
        gl.uniform2f(gl.getUniformLocation(this.program_Present, "uMousePosition"), mousePosition.x, mousePosition.y);

        // Create vec2 shader input for SWE width height:
        gl.uniform2f(gl.getUniformLocation(this.program_Present, "g_vRTRes"), app.getWidth(), app.getHeight());

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

}

