//globals
let framerate = 30;
let frame_time = 1000 / framerate;
let COORDS_PER_NODE = 3;
let COLOR_COMPONENTS = 3;

const { vec3, mat3, mat4 } = glMatrix;

"use strict";

// vertex shader
const VSHADER_SOURCE =
	'uniform mat4 u_ModelMatrix;\n' +
	'attribute vec4 a_Position;\n' +
	'attribute vec4 a_FragColor;\n' +
	'varying vec4 v_FragColor;\n' +
	'void main() \n' +
	'{\n' +
	'   gl_Position = u_ModelMatrix * a_Position;\n' +
	'   gl_PointSize = 5.0;\n' +
	'   v_FragColor = a_FragColor;\n' +
	'}\n';

// framgent shader
const FSHADER_SOURCE =
	'precision highp float;\n' +
	'varying vec4 v_FragColor;\n' +
	'void main() \n' +
	'{\n' +
	'   gl_FragColor = v_FragColor;\n' +
	'}\n';

// cloth simulation class
class FrameDrawer {
	// constructor
	constructor(show_nodes_checkbox, coord, color, indices, canvas_size, gl) {
		// initialize arrays
		this.coord = coord;
		this.color = color;
		this.indices = indices;

		// initialize camera matrices
		this.time_step = frame_time;
		this.look_matrix = mat4.create();
		this.camera_position = vec3.fromValues(2.5, 2.5, 0.5);
		this.camera_rotation_left = mat3.create();
		mat3.fromRotation(this.camera_rotation_left, -1 / this.time_step);
		this.camera_rotation_right = mat3.create();
		mat3.invert(this.camera_rotation_right, this.camera_rotation_left);
		this.center_of_the_scene = [0, 0, 0];
		this.top_direction = [0, 0, 1];
		mat4.lookAt(this.look_matrix, this.camera_position, this.center_of_the_scene, this.top_direction);

		// initialize perspectice matrix
		this.perspective_matrix = mat4.create();
		mat4.perspective(this.perspective_matrix, Math.PI * 0.3, 1.0, 0.2, 5.0);

		// initialize buttons flags
		this.left_arrow_pressed = false;
		this.right_arrow_pressed = false;
		this.up_arrow_pressed = false;
		this.down_arrow_pressed = false;

		// initilize extra data
		this.canvas_size = canvas_size;
		this.gl = gl;
		this.show_nodes_checkbox = show_nodes_checkbox;
		this.look_matrix_ptr = gl.getUniformLocation(gl.program, 'u_ModelMatrix');

		// initislize buffers
		this.index_buffer = this.gl.createBuffer();
		let size;
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
		size = this.indices.BYTES_PER_ELEMENT * this.indices.length;
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, size, this.gl.STATIC_DRAW);
		this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, 0, this.indices);

		this.data_buffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.data_buffer);
		size = this.coord.BYTES_PER_ELEMENT * this.coord.length + this.color.BYTES_PER_ELEMENT * this.color.length;
		this.gl.bufferData(this.gl.ARRAY_BUFFER, size, this.gl.STATIC_DRAW);
		this.a_Position = this.gl.getAttribLocation(this.gl.program, 'a_Position');
		this.a_FragColor = this.gl.getAttribLocation(this.gl.program, 'a_FragColor');
		this.gl.enableVertexAttribArray(this.a_Position);
		this.gl.enableVertexAttribArray(this.a_FragColor);
		this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
		this.gl.vertexAttribPointer(this.a_FragColor, 3, this.gl.FLOAT, false, 0, this.coord.BYTES_PER_ELEMENT * this.coord.length);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.coord);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.coord.BYTES_PER_ELEMENT * this.coord.length, this.color);

		// initialize look matrix
		this.gl.uniformMatrix4fv(this.look_matrix_ptr, false, this.look_matrix);

		// start animation
		setInterval(this.drawFrame.bind(this), this.time_step);
	}

	// process key press event
	keyDown(key_event) {
		if (key_event.key == "ArrowDown")
			this.down_arrow_pressed = true;

		if (key_event.key == "ArrowUp")
			this.up_arrow_pressed = true;

		if (key_event.key == "ArrowLeft")
			this.left_arrow_pressed = true;

		if (key_event.key == "ArrowRight")
			this.right_arrow_pressed = true;
	}

	keyUp(key_event) {
		if (key_event.key == "ArrowDown")
			this.down_arrow_pressed = false;

		if (key_event.key == "ArrowUp")
			this.up_arrow_pressed = false;

		if (key_event.key == "ArrowLeft")
			this.left_arrow_pressed = false;

		if (key_event.key == "ArrowRight")
			this.right_arrow_pressed = false;
	}

	// draw frame
	drawFrame() {
		// move camera
		if (this.down_arrow_pressed)
			this.camera_position[2] -= 1.5 / frame_time;
		if (this.up_arrow_pressed)
			this.camera_position[2] += 1.5 / frame_time;

		if (this.left_arrow_pressed)
			vec3.transformMat3(this.camera_position, this.camera_position, this.camera_rotation_left);
		if (this.right_arrow_pressed)
			vec3.transformMat3(this.camera_position, this.camera_position, this.camera_rotation_right);

		mat4.lookAt(this.look_matrix, this.camera_position, this.center_of_the_scene, this.top_direction);
		this.gl.uniformMatrix4fv(this.look_matrix_ptr, false, mat4.multiply(mat4.create(), this.perspective_matrix, this.look_matrix));

		// clear screen
		this.gl.clearColor(1, 1, 1, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

		// draw nodes or solid object
		if (this.show_nodes_checkbox.checked)
			this.gl.drawArrays(this.gl.POINTS, 0, this.coord.length / COORDS_PER_NODE);
		else
			this.gl.drawElements(this.gl.TRIANGLES, this.indices.length, this.gl.UNSIGNED_SHORT, 0);
	}
}

// main function
function main() {
	// get pointers to the elements of the interface
	const canvas = document.getElementById('webgl');
	const show_nodes_checkbox = document.getElementById("show_nodes_checkbox");

	// get draw context
	const gl = getWebGLContext(canvas);
	initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);

	// get data from interface
	let canvas_size = canvas.width;

	// initialize arrays

	// create frame drawer
	frame_drawer = new FrameDrawer(show_nodes_checkbox, coord, color, indices, canvas_size, gl);

	// set events handlers
	document.onkeydown = function (key_event) { frame_drawer.keyDown(key_event) };
	document.onkeyup = function (key_event) { frame_drawer.keyUp(key_event) };
	// canvas.onmousedown = function (mouse_event) { frame_drawer.mouseDown(mouse_event) };
	// canvas.onmouseup = function (mouse_event) { frame_drawer.mouseUp(mouse_event) };
	// canvas.onmousemove = function (mouse_event) { frame_drawer.mouseMoved(mouse_event) };
}