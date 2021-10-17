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

	let number_of_nodes = 328;
	let coord = new Float32Array(number_of_nodes * COORDS_PER_NODE);
	let color = new Float32Array(number_of_nodes * COLOR_COMPONENTS);

	coord[0] = -0.266667;
	coord[1] = 0.666667;
	coord[2] = 0;
	color[0] = 0.00254492;
	color[1] = 0;
	color[2] = 0.997455;

	coord[3] = -0.266667;
	coord[4] = 0.666667;
	coord[5] = 0.666667;
	color[3] = 0.00254492;
	color[4] = 0;
	color[5] = 0.997455;

	coord[6] = -1;
	coord[7] = 0.666667;
	coord[8] = 0;
	color[6] = 0.00254492;
	color[7] = 0;
	color[8] = 0.997455;

	coord[9] = -1;
	coord[10] = 0.666667;
	coord[11] = 0.666667;
	color[9] = 0.00254492;
	color[10] = 0;
	color[11] = 0.997455;

	coord[12] = 0.266667;
	coord[13] = 0.666667;
	coord[14] = 0;
	color[12] = 0.0123613;
	color[13] = 0;
	color[14] = 0.987639;

	coord[15] = 0.266667;
	coord[16] = 0.666667;
	coord[17] = 0.666667;
	color[15] = 0.996012;
	color[16] = 0;
	color[17] = 0.00398755;

	coord[18] = 1;
	coord[19] = 0.666667;
	coord[20] = 0.666667;
	color[18] = 1;
	color[19] = 0;
	color[20] = 0;

	coord[21] = 1;
	coord[22] = 0.666667;
	coord[23] = 0;
	color[21] = 0.012402;
	color[22] = 0;
	color[23] = 0.987598;

	coord[24] = -0.266667;
	coord[25] = 0.266667;
	coord[26] = 0.666667;
	color[24] = 0.77791;
	color[25] = 0;
	color[26] = 0.22209;

	coord[27] = 0.266667;
	coord[28] = 0.266667;
	coord[29] = 0.666667;
	color[27] = 0.982151;
	color[28] = 0;
	color[29] = 0.0178486;

	coord[30] = -1;
	coord[31] = -0.666667;
	coord[32] = 0.666667;
	color[30] = 0.948685;
	color[31] = 0;
	color[32] = 0.0513151;

	coord[33] = 1;
	coord[34] = -0.666667;
	coord[35] = 0.666667;
	color[33] = 0.99896;
	color[34] = 0;
	color[35] = 0.00104019;

	coord[36] = -0.266667;
	coord[37] = 0.266667;
	coord[38] = 0;
	color[36] = 0.00945968;
	color[37] = 0;
	color[38] = 0.99054;

	coord[39] = 0.266667;
	coord[40] = 0.266667;
	coord[41] = 0;
	color[39] = 0.0124387;
	color[40] = 0;
	color[41] = 0.987561;

	coord[42] = 1;
	coord[43] = -0.666667;
	coord[44] = 0;
	color[42] = 0.0124837;
	color[43] = 0;
	color[44] = 0.987516;

	coord[45] = -1;
	coord[46] = -0.666667;
	coord[47] = 0;
	color[45] = 0.0112186;
	color[46] = 0;
	color[47] = 0.988781;

	coord[48] = -0.266667;
	coord[49] = 0.666667;
	coord[50] = 0.159333;
	color[48] = 0.00254492;
	color[49] = 0;
	color[50] = 0.997455;

	coord[51] = -0.266667;
	coord[52] = 0.666667;
	coord[53] = 0.355333;
	color[51] = 0.00254492;
	color[52] = 0;
	color[53] = 0.997455;

	coord[54] = -0.266667;
	coord[55] = 0.666667;
	coord[56] = 0.523333;
	color[54] = 0.00254492;
	color[55] = 0;
	color[56] = 0.997455;

	coord[57] = -0.4148;
	coord[58] = 0.666667;
	coord[59] = 0;
	color[57] = 0.00254492;
	color[58] = 0;
	color[59] = 0.997455;

	coord[60] = -0.580533;
	coord[61] = 0.666667;
	coord[62] = 0;
	color[60] = 0.00254492;
	color[61] = 0;
	color[62] = 0.997455;

	coord[63] = -0.770467;
	coord[64] = 0.666667;
	coord[65] = 0;
	color[63] = 0.00254492;
	color[64] = 0;
	color[65] = 0.997455;

	coord[66] = -1;
	coord[67] = 0.666667;
	coord[68] = 0.45;
	color[66] = 0.00254492;
	color[67] = 0;
	color[68] = 0.997455;

	coord[69] = -1;
	coord[70] = 0.666667;
	coord[71] = 0.224;
	color[69] = 0.00254492;
	color[70] = 0;
	color[71] = 0.997455;

	coord[72] = -0.418467;
	coord[73] = 0.666667;
	coord[74] = 0.666667;
	color[72] = 0.00254492;
	color[73] = 0;
	color[74] = 0.997455;

	coord[75] = -0.587133;
	coord[76] = 0.666667;
	coord[77] = 0.666667;
	color[75] = 0.00254492;
	color[76] = 0;
	color[77] = 0.997455;

	coord[78] = -0.774867;
	coord[79] = 0.666667;
	coord[80] = 0.666667;
	color[78] = 0.00254492;
	color[79] = 0;
	color[80] = 0.997455;

	coord[81] = 0.266667;
	coord[82] = 0.666667;
	coord[83] = 0.144667;
	color[81] = 0.224687;
	color[82] = 0;
	color[83] = 0.775313;

	coord[84] = 0.266667;
	coord[85] = 0.666667;
	coord[86] = 0.305333;
	color[84] = 0.460842;
	color[85] = 0;
	color[86] = 0.539158;

	coord[87] = 0.266667;
	coord[88] = 0.666667;
	coord[89] = 0.491333;
	color[87] = 0.735537;
	color[88] = 0;
	color[89] = 0.264463;

	coord[90] = 0.774867;
	coord[91] = 0.666667;
	coord[92] = 0.666667;
	color[90] = 0.999223;
	color[91] = 0;
	color[92] = 0.000776628;

	coord[93] = 0.587133;
	coord[94] = 0.666667;
	coord[95] = 0.666667;
	color[93] = 0.99776;
	color[94] = 0;
	color[95] = 0.00223993;

	coord[96] = 0.417733;
	coord[97] = 0.666667;
	coord[98] = 0.666667;
	color[96] = 0.996587;
	color[97] = 0;
	color[98] = 0.00341339;

	coord[99] = 1;
	coord[100] = 0.666667;
	coord[101] = 0.44;
	color[99] = 0.662747;
	color[100] = 0;
	color[101] = 0.337253;

	coord[102] = 1;
	coord[103] = 0.666667;
	coord[104] = 0.216;
	color[102] = 0.331245;
	color[103] = 0;
	color[104] = 0.668755;

	coord[105] = 0.774867;
	coord[106] = 0.666667;
	coord[107] = 0;
	color[105] = 0.0123544;
	color[106] = 0;
	color[107] = 0.987646;

	coord[108] = 0.587133;
	coord[109] = 0.666667;
	coord[110] = 0;
	color[108] = 0.012378;
	color[109] = 0;
	color[110] = 0.987622;

	coord[111] = 0.417733;
	coord[112] = 0.666667;
	coord[113] = 0;
	color[111] = 0.0123336;
	color[112] = 0;
	color[113] = 0.987666;

	coord[114] = -0.1424;
	coord[115] = 0.266667;
	coord[116] = 0.666667;
	color[114] = 0.882121;
	color[115] = 0;
	color[116] = 0.117879;

	coord[117] = -0.0064;
	coord[118] = 0.266667;
	coord[119] = 0.666667;
	color[117] = 0.928739;
	color[118] = 0;
	color[119] = 0.0712612;

	coord[120] = 0.1392;
	coord[121] = 0.266667;
	coord[122] = 0.666667;
	color[120] = 0.960372;
	color[121] = 0;
	color[122] = 0.0396276;

	coord[123] = -0.266667;
	coord[124] = 0.521867;
	coord[125] = 0.666667;
	color[123] = 0.39029;
	color[124] = 0;
	color[125] = 0.60971;

	coord[126] = -0.266667;
	coord[127] = 0.394667;
	coord[128] = 0.666667;
	color[126] = 0.589175;
	color[127] = 0;
	color[128] = 0.410825;

	coord[129] = -1;
	coord[130] = 0.428;
	coord[131] = 0.666667;
	color[129] = 0.478823;
	color[130] = 0;
	color[131] = 0.521177;

	coord[132] = -1;
	coord[133] = 0.173333;
	coord[134] = 0.666667;
	color[132] = 0.751594;
	color[133] = 0;
	color[134] = 0.248406;

	coord[135] = -1;
	coord[136] = -0.0866667;
	coord[137] = 0.666667;
	color[135] = 0.866904;
	color[136] = 0;
	color[137] = 0.133096;

	coord[138] = -1;
	coord[139] = -0.408;
	coord[140] = 0.666667;
	color[138] = 0.934705;
	color[139] = 0;
	color[140] = 0.0652947;

	coord[141] = -0.758;
	coord[142] = -0.666667;
	coord[143] = 0.666667;
	color[141] = 0.950016;
	color[142] = 0;
	color[143] = 0.0499839;

	coord[144] = -0.49;
	coord[145] = -0.666667;
	coord[146] = 0.666667;
	color[144] = 0.956835;
	color[145] = 0;
	color[146] = 0.0431654;

	coord[147] = -0.182;
	coord[148] = -0.666667;
	coord[149] = 0.666667;
	color[147] = 0.96895;
	color[148] = 0;
	color[149] = 0.0310496;

	coord[150] = 0.14;
	coord[151] = -0.666667;
	coord[152] = 0.666667;
	color[150] = 0.982691;
	color[151] = 0;
	color[152] = 0.0173087;

	coord[153] = 0.458;
	coord[154] = -0.666667;
	coord[155] = 0.666667;
	color[153] = 0.992348;
	color[154] = 0;
	color[155] = 0.00765163;

	coord[156] = 0.756;
	coord[157] = -0.666667;
	coord[158] = 0.666667;
	color[156] = 0.998071;
	color[157] = 0;
	color[158] = 0.00192886;

	coord[159] = 1;
	coord[160] = -0.409333;
	coord[161] = 0.666667;
	color[159] = 0.998608;
	color[160] = 0;
	color[161] = 0.00139184;

	coord[162] = 1;
	coord[163] = -0.105333;
	coord[164] = 0.666667;
	color[162] = 0.998517;
	color[163] = 0;
	color[164] = 0.00148285;

	coord[165] = 1;
	coord[166] = 0.156;
	coord[167] = 0.666667;
	color[165] = 0.998852;
	color[166] = 0;
	color[167] = 0.0011479;

	coord[168] = 1;
	coord[169] = 0.408;
	coord[170] = 0.666667;
	color[168] = 0.999416;
	color[169] = 0;
	color[170] = 0.000583502;

	coord[171] = 0.266667;
	coord[172] = 0.394667;
	coord[173] = 0.666667;
	color[171] = 0.990721;
	color[172] = 0;
	color[173] = 0.00927867;

	coord[174] = 0.266667;
	coord[175] = 0.533867;
	coord[176] = 0.666667;
	color[174] = 0.995131;
	color[175] = 0;
	color[176] = 0.00486851;

	coord[177] = -0.266667;
	coord[178] = 0.389867;
	coord[179] = 0;
	color[177] = 0.00755218;
	color[178] = 0;
	color[179] = 0.992448;

	coord[180] = -0.266667;
	coord[181] = 0.524267;
	coord[182] = 0;
	color[180] = 0;
	color[181] = 0;
	color[182] = 1;

	coord[183] = 0.072;
	coord[184] = 0.266667;
	coord[185] = 0;
	color[183] = 0.0108854;
	color[184] = 0;
	color[185] = 0.989115;

	coord[186] = -0.1072;
	coord[187] = 0.266667;
	coord[188] = 0;
	color[186] = 0.0104297;
	color[187] = 0;
	color[188] = 0.98957;

	coord[189] = 0.266667;
	coord[190] = 0.525067;
	coord[191] = 0;
	color[189] = 0.0122783;
	color[190] = 0;
	color[191] = 0.987722;

	coord[192] = 0.266667;
	coord[193] = 0.401467;
	coord[194] = 0;
	color[192] = 0.0122078;
	color[193] = 0;
	color[194] = 0.987792;

	coord[195] = 1;
	coord[196] = -0.418667;
	coord[197] = 0;
	color[195] = 0.0123654;
	color[196] = 0;
	color[197] = 0.987635;

	coord[198] = 1;
	coord[199] = -0.137333;
	coord[200] = 0;
	color[198] = 0.0123105;
	color[199] = 0;
	color[200] = 0.987689;

	coord[201] = 1;
	coord[202] = 0.166667;
	coord[203] = 0;
	color[201] = 0.0124118;
	color[202] = 0;
	color[203] = 0.987588;

	coord[204] = 1;
	coord[205] = 0.441333;
	coord[206] = 0;
	color[204] = 0.0123963;
	color[205] = 0;
	color[206] = 0.987604;

	coord[207] = -0.724;
	coord[208] = -0.666667;
	coord[209] = 0;
	color[207] = 0.0115742;
	color[208] = 0;
	color[209] = 0.988426;

	coord[210] = -0.412;
	coord[211] = -0.666667;
	coord[212] = 0;
	color[210] = 0.01188;
	color[211] = 0;
	color[212] = 0.98812;

	coord[213] = -0.1;
	coord[214] = -0.666667;
	coord[215] = 0;
	color[213] = 0.0123958;
	color[214] = 0;
	color[215] = 0.987604;

	coord[216] = 0.228;
	coord[217] = -0.666667;
	coord[218] = 0;
	color[216] = 0.0122825;
	color[217] = 0;
	color[218] = 0.987718;

	coord[219] = 0.51;
	coord[220] = -0.666667;
	coord[221] = 0;
	color[219] = 0.0123112;
	color[220] = 0;
	color[221] = 0.987689;

	coord[222] = 0.768;
	coord[223] = -0.666667;
	coord[224] = 0;
	color[222] = 0.0122503;
	color[223] = 0;
	color[224] = 0.98775;

	coord[225] = -1;
	coord[226] = 0.412;
	coord[227] = 0;
	color[225] = 0.0108377;
	color[226] = 0;
	color[227] = 0.989162;

	coord[228] = -1;
	coord[229] = 0.182667;
	coord[230] = 0;
	color[228] = 0.00780561;
	color[229] = 0;
	color[230] = 0.992194;

	coord[231] = -1;
	coord[232] = -0.0786667;
	coord[233] = 0;
	color[231] = 0.00980351;
	color[232] = 0;
	color[233] = 0.990196;

	coord[234] = -1;
	coord[235] = -0.368;
	coord[236] = 0;
	color[234] = 0.0119827;
	color[235] = 0;
	color[236] = 0.988017;

	coord[237] = -1;
	coord[238] = -0.666667;
	coord[239] = 0.457333;
	color[237] = 0.644734;
	color[238] = 0;
	color[239] = 0.355266;

	coord[240] = -1;
	coord[241] = -0.666667;
	coord[242] = 0.239333;
	color[240] = 0.338068;
	color[241] = 0;
	color[242] = 0.661932;

	coord[243] = 1;
	coord[244] = -0.666667;
	coord[245] = 0.444;
	color[243] = 0.667973;
	color[244] = 0;
	color[245] = 0.332027;

	coord[246] = 1;
	coord[247] = -0.666667;
	coord[248] = 0.222;
	color[246] = 0.339849;
	color[247] = 0;
	color[248] = 0.660151;

	coord[249] = 0.266667;
	coord[250] = 0.266667;
	coord[251] = 0.171333;
	color[249] = 0.257906;
	color[250] = 0;
	color[251] = 0.742094;

	coord[252] = 0.266667;
	coord[253] = 0.266667;
	coord[254] = 0.346667;
	color[252] = 0.511555;
	color[253] = 0;
	color[254] = 0.488445;

	coord[255] = 0.266667;
	coord[256] = 0.266667;
	coord[257] = 0.53;
	color[255] = 0.780034;
	color[256] = 0;
	color[257] = 0.219966;

	coord[258] = -0.266667;
	coord[259] = 0.266667;
	coord[260] = 0.152667;
	color[258] = 0.162143;
	color[259] = 0;
	color[260] = 0.837857;

	coord[261] = -0.266667;
	coord[262] = 0.266667;
	coord[263] = 0.338667;
	color[261] = 0.351287;
	color[262] = 0;
	color[263] = 0.648713;

	coord[264] = -0.266667;
	coord[265] = 0.266667;
	coord[266] = 0.526667;
	color[264] = 0.582662;
	color[265] = 0;
	color[266] = 0.417338;

	coord[267] = -0.413581;
	coord[268] = 0.666667;
	coord[269] = 0.227216;
	color[267] = 0.00254492;
	color[268] = 0;
	color[269] = 0.997455;

	coord[270] = -0.465343;
	coord[271] = 0.666667;
	coord[272] = 0.442098;
	color[270] = 0.00254492;
	color[271] = 0;
	color[272] = 0.997455;

	coord[273] = -0.528939;
	coord[274] = 0.666667;
	coord[275] = 0.129067;
	color[273] = 0.00254492;
	color[274] = 0;
	color[275] = 0.997455;

	coord[276] = -0.672353;
	coord[277] = 0.666667;
	coord[278] = 0.146065;
	color[276] = 0.00254492;
	color[277] = 0;
	color[278] = 0.997455;

	coord[279] = -0.839563;
	coord[280] = 0.666667;
	coord[281] = 0.147058;
	color[279] = 0.00254492;
	color[280] = 0;
	color[281] = 0.997455;

	coord[282] = -0.743109;
	coord[283] = 0.666667;
	coord[284] = 0.369504;
	color[282] = 0.00254492;
	color[283] = 0;
	color[284] = 0.997455;

	coord[285] = -0.565852;
	coord[286] = 0.666667;
	coord[287] = 0.264895;
	color[285] = 0.00254492;
	color[286] = 0;
	color[287] = 0.997455;

	coord[288] = 0.461669;
	coord[289] = 0.666667;
	coord[290] = 0.201528;
	color[288] = 0.308464;
	color[289] = 0;
	color[290] = 0.691536;

	coord[291] = 0.410559;
	coord[292] = 0.666667;
	coord[293] = 0.40772;
	color[291] = 0.612418;
	color[292] = 0;
	color[293] = 0.387582;

	coord[294] = 0.375488;
	coord[295] = 0.666667;
	coord[296] = 0.55065;
	color[294] = 0.823928;
	color[295] = 0;
	color[296] = 0.176072;

	coord[297] = 0.698421;
	coord[298] = 0.666667;
	coord[299] = 0.50787;
	color[297] = 0.762563;
	color[298] = 0;
	color[299] = 0.237437;

	coord[300] = 0.513765;
	coord[301] = 0.666667;
	coord[302] = 0.528759;
	color[300] = 0.792033;
	color[301] = 0;
	color[302] = 0.207967;

	coord[303] = 0.692391;
	coord[304] = 0.666667;
	coord[305] = 0.178969;
	color[303] = 0.276054;
	color[304] = 0;
	color[305] = 0.723946;

	coord[306] = 0.792186;
	coord[307] = 0.666667;
	coord[308] = 0.340166;
	color[306] = 0.514465;
	color[307] = 0;
	color[308] = 0.485535;

	coord[309] = 0.593917;
	coord[310] = 0.666667;
	coord[311] = 0.360634;
	color[309] = 0.543788;
	color[310] = 0;
	color[311] = 0.456212;

	coord[312] = -0.223949;
	coord[313] = 0.141684;
	coord[314] = 0.666667;
	color[312] = 0.866107;
	color[313] = 0;
	color[314] = 0.133893;

	coord[315] = -0.0706022;
	coord[316] = 0.141299;
	coord[317] = 0.666667;
	color[315] = 0.917281;
	color[316] = 0;
	color[317] = 0.0827187;

	coord[318] = 0.0726233;
	coord[319] = 0.147773;
	coord[320] = 0.666667;
	color[318] = 0.951311;
	color[319] = 0;
	color[320] = 0.0486889;

	coord[321] = 0.218269;
	coord[322] = 0.143684;
	coord[323] = 0.666667;
	color[321] = 0.972731;
	color[322] = 0;
	color[323] = 0.0272689;

	coord[324] = -0.390615;
	coord[325] = 0.467289;
	coord[326] = 0.666667;
	color[324] = 0.454295;
	color[325] = 0;
	color[326] = 0.545705;

	coord[327] = -0.381406;
	coord[328] = 0.329086;
	coord[329] = 0.666667;
	color[327] = 0.656378;
	color[328] = 0;
	color[329] = 0.343622;

	coord[330] = -0.531692;
	coord[331] = 0.520638;
	coord[332] = 0.666667;
	color[330] = 0.368644;
	color[331] = 0;
	color[332] = 0.631356;

	coord[333] = -0.671038;
	coord[334] = 0.545255;
	coord[335] = 0.666667;
	color[333] = 0.285082;
	color[334] = 0;
	color[335] = 0.714918;

	coord[336] = -0.817567;
	coord[337] = 0.490301;
	coord[338] = 0.666667;
	color[336] = 0.389063;
	color[337] = 0;
	color[338] = 0.610937;

	coord[339] = -0.817793;
	coord[340] = 0.28562;
	coord[341] = 0.666667;
	color[339] = 0.647879;
	color[340] = 0;
	color[341] = 0.352121;

	coord[342] = -0.8013;
	coord[343] = 0.0611751;
	coord[344] = 0.666667;
	color[342] = 0.807023;
	color[343] = 0;
	color[344] = 0.192977;

	coord[345] = -0.630496;
	coord[346] = -0.429208;
	coord[347] = 0.666667;
	color[345] = 0.942377;
	color[346] = 0;
	color[347] = 0.0576232;

	coord[348] = -0.341341;
	coord[349] = -0.436153;
	coord[350] = 0.666667;
	color[348] = 0.954426;
	color[349] = 0;
	color[350] = 0.0455736;

	coord[351] = -0.0414342;
	coord[352] = -0.426322;
	coord[353] = 0.666667;
	color[351] = 0.970809;
	color[352] = 0;
	color[353] = 0.0291912;

	coord[354] = 0.269419;
	coord[355] = -0.428252;
	coord[356] = 0.666667;
	color[354] = 0.98599;
	color[355] = 0;
	color[356] = 0.0140105;

	coord[357] = 0.540384;
	coord[358] = -0.441603;
	coord[359] = 0.666667;
	color[357] = 0.994054;
	color[358] = 0;
	color[359] = 0.00594602;

	coord[360] = 0.802233;
	coord[361] = -0.207188;
	coord[362] = 0.666667;
	color[360] = 0.997477;
	color[361] = 0;
	color[362] = 0.00252308;

	coord[363] = 0.810019;
	coord[364] = 0.013285;
	coord[365] = 0.666667;
	color[363] = 0.997695;
	color[364] = 0;
	color[365] = 0.00230518;

	coord[366] = 0.802967;
	coord[367] = 0.236142;
	coord[368] = 0.666667;
	color[366] = 0.998175;
	color[367] = 0;
	color[368] = 0.00182497;

	coord[369] = 0.789296;
	coord[370] = 0.456545;
	coord[371] = 0.666667;
	color[369] = 0.99884;
	color[370] = 0;
	color[371] = 0.00116046;

	coord[372] = 0.567632;
	coord[373] = 0.500169;
	coord[374] = 0.666667;
	color[372] = 0.997056;
	color[373] = 0;
	color[374] = 0.00294368;

	coord[375] = 0.416269;
	coord[376] = 0.344508;
	coord[377] = 0.666667;
	color[375] = 0.992194;
	color[376] = 0;
	color[377] = 0.00780551;

	coord[378] = 0.388796;
	coord[379] = 0.486275;
	coord[380] = 0.666667;
	color[378] = 0.9948;
	color[379] = 0;
	color[380] = 0.00519952;

	coord[381] = 0.409813;
	coord[382] = 0.160802;
	coord[383] = 0.666667;
	color[381] = 0.988125;
	color[382] = 0;
	color[383] = 0.0118747;

	coord[384] = -0.372178;
	coord[385] = 0.189465;
	coord[386] = 0.666667;
	color[384] = 0.790605;
	color[385] = 0;
	color[386] = 0.209395;

	coord[387] = 0.747814;
	coord[388] = -0.401968;
	coord[389] = 0.666667;
	color[387] = 0.997116;
	color[388] = 0;
	color[389] = 0.0028836;

	coord[390] = -0.748388;
	coord[391] = -0.180283;
	coord[392] = 0.666667;
	color[390] = 0.900359;
	color[391] = 0;
	color[392] = 0.099641;

	coord[393] = -0.481863;
	coord[394] = -0.211486;
	coord[395] = 0.666667;
	color[393] = 0.919575;
	color[394] = 0;
	color[395] = 0.0804246;

	coord[396] = 0.0140044;
	coord[397] = 0.0330781;
	coord[398] = 0.666667;
	color[396] = 0.946498;
	color[397] = 0;
	color[398] = 0.053502;

	coord[399] = 0.140648;
	coord[400] = 0.033839;
	coord[401] = 0.666667;
	color[399] = 0.965017;
	color[400] = 0;
	color[401] = 0.0349828;

	coord[402] = -0.489624;
	coord[403] = 0.392787;
	coord[404] = 0.666667;
	color[402] = 0.56834;
	color[403] = 0;
	color[404] = 0.43166;

	coord[405] = -0.639001;
	coord[406] = 0.381926;
	coord[407] = 0.666667;
	color[405] = 0.569907;
	color[406] = 0;
	color[407] = 0.430093;

	coord[408] = -0.643712;
	coord[409] = 0.184176;
	coord[410] = 0.666667;
	color[408] = 0.754129;
	color[409] = 0;
	color[410] = 0.245871;

	coord[411] = 0.601993;
	coord[412] = 0.298067;
	coord[413] = 0.666667;
	color[411] = 0.99593;
	color[412] = 0;
	color[413] = 0.00407045;

	coord[414] = 0.424333;
	coord[415] = -0.206363;
	coord[416] = 0.666667;
	color[414] = 0.989972;
	color[415] = 0;
	color[416] = 0.0100279;

	coord[417] = 0.0861111;
	coord[418] = -0.150949;
	coord[419] = 0.666667;
	color[417] = 0.968125;
	color[418] = 0;
	color[419] = 0.0318745;

	coord[420] = 0.631015;
	coord[421] = -0.095011;
	coord[422] = 0.666667;
	color[420] = 0.995041;
	color[421] = 0;
	color[422] = 0.00495925;

	coord[423] = -0.361795;
	coord[424] = 0.00308593;
	coord[425] = 0.666667;
	color[423] = 0.8821;
	color[424] = 0;
	color[425] = 0.1179;

	coord[426] = -0.136718;
	coord[427] = -0.013372;
	coord[428] = 0.666667;
	color[426] = 0.926167;
	color[427] = 0;
	color[428] = 0.073833;

	coord[429] = -0.503977;
	coord[430] = 0.264717;
	coord[431] = 0.666667;
	color[429] = 0.702604;
	color[430] = 0;
	color[431] = 0.297396;

	coord[432] = 0.295472;
	coord[433] = -0.00947037;
	coord[434] = 0.666667;
	color[432] = 0.980438;
	color[433] = 0;
	color[434] = 0.019562;

	coord[435] = 0.622689;
	coord[436] = 0.100895;
	coord[437] = 0.666667;
	color[435] = 0.995208;
	color[436] = 0;
	color[437] = 0.00479216;

	coord[438] = -0.591877;
	coord[439] = -0.00772292;
	coord[440] = 0.666667;
	color[438] = 0.854643;
	color[439] = 0;
	color[440] = 0.145357;

	coord[441] = -0.496697;
	coord[442] = 0.125208;
	coord[443] = 0.666667;
	color[441] = 0.802847;
	color[442] = 0;
	color[443] = 0.197153;

	coord[444] = -0.216948;
	coord[445] = -0.211787;
	coord[446] = 0.666667;
	color[444] = 0.944052;
	color[445] = 0;
	color[446] = 0.0559482;

	coord[447] = 0.628961;
	coord[448] = -0.271273;
	coord[449] = 0.666667;
	color[447] = 0.995114;
	color[448] = 0;
	color[449] = 0.00488632;

	coord[450] = 0.476469;
	coord[451] = -0.00945771;
	coord[452] = 0.666667;
	color[450] = 0.990276;
	color[451] = 0;
	color[452] = 0.00972403;

	coord[453] = -0.374824;
	coord[454] = 0.345545;
	coord[455] = 0;
	color[453] = 0.00523812;
	color[454] = 0;
	color[455] = 0.994762;

	coord[456] = -0.389683;
	coord[457] = 0.471754;
	coord[458] = 0;
	color[456] = 0.0120155;
	color[457] = 0;
	color[458] = 0.987985;

	coord[459] = 0.157294;
	coord[460] = 0.100193;
	coord[461] = 0;
	color[459] = 0.0119534;
	color[460] = 0;
	color[461] = 0.988047;

	coord[462] = -0.0266772;
	coord[463] = 0.119952;
	coord[464] = 0;
	color[462] = 0.012041;
	color[463] = 0;
	color[464] = 0.987959;

	coord[465] = -0.185563;
	coord[466] = 0.134009;
	coord[467] = 0;
	color[465] = 0.0105807;
	color[466] = 0;
	color[467] = 0.989419;

	coord[468] = 0.403685;
	coord[469] = 0.463327;
	coord[470] = 0;
	color[468] = 0.0123369;
	color[469] = 0;
	color[470] = 0.987663;

	coord[471] = 0.402543;
	coord[472] = 0.300702;
	coord[473] = 0;
	color[471] = 0.0122089;
	color[472] = 0;
	color[473] = 0.987791;

	coord[474] = 0.693503;
	coord[475] = 0.49613;
	coord[476] = 0;
	color[474] = 0.0123586;
	color[475] = 0;
	color[476] = 0.987641;

	coord[477] = 0.700327;
	coord[478] = -0.326741;
	coord[479] = 0;
	color[477] = 0.0124484;
	color[478] = 0;
	color[479] = 0.987552;

	coord[480] = 0.753892;
	coord[481] = 0.013796;
	coord[482] = 0;
	color[480] = 0.0123549;
	color[481] = 0;
	color[482] = 0.987645;

	coord[483] = 0.756514;
	coord[484] = 0.276427;
	coord[485] = 0;
	color[483] = 0.0123406;
	color[484] = 0;
	color[485] = 0.987659;

	coord[486] = -0.599613;
	coord[487] = -0.353214;
	coord[488] = 0;
	color[486] = 0.0115313;
	color[487] = 0;
	color[488] = 0.988469;

	coord[489] = -0.27144;
	coord[490] = -0.391043;
	coord[491] = 0;
	color[489] = 0.0114788;
	color[490] = 0;
	color[491] = 0.988521;

	coord[492] = 0.0472531;
	coord[493] = -0.33739;
	coord[494] = 0;
	color[492] = 0.0119248;
	color[493] = 0;
	color[494] = 0.988075;

	coord[495] = 0.373066;
	coord[496] = -0.362601;
	coord[497] = 0;
	color[495] = 0.0121357;
	color[496] = 0;
	color[497] = 0.987864;

	coord[498] = -0.827307;
	coord[499] = 0.279814;
	coord[500] = 0;
	color[498] = 0.00496309;
	color[499] = 0;
	color[500] = 0.995037;

	coord[501] = -0.810437;
	coord[502] = 0.058974;
	coord[503] = 0;
	color[501] = 0.0125305;
	color[502] = 0;
	color[503] = 0.987469;

	coord[504] = -0.803174;
	coord[505] = -0.162018;
	coord[506] = 0;
	color[504] = 0.00982428;
	color[505] = 0;
	color[506] = 0.990176;

	coord[507] = -0.512152;
	coord[508] = 0.54101;
	coord[509] = 0;
	color[507] = 0.00452163;
	color[508] = 0;
	color[509] = 0.995478;

	coord[510] = -0.651203;
	coord[511] = 0.51839;
	coord[512] = 0;
	color[510] = 0.0038943;
	color[511] = 0;
	color[512] = 0.996106;

	coord[513] = 0.357039;
	coord[514] = 0.111473;
	coord[515] = 0;
	color[513] = 0.0120334;
	color[514] = 0;
	color[515] = 0.987967;

	coord[516] = 0.531754;
	coord[517] = 0.531782;
	coord[518] = 0;
	color[516] = 0.0123277;
	color[517] = 0;
	color[518] = 0.987672;

	coord[519] = -0.821304;
	coord[520] = 0.481207;
	coord[521] = 0;
	color[519] = 0.00423324;
	color[520] = 0;
	color[521] = 0.995767;

	coord[522] = -0.319262;
	coord[523] = 0.136908;
	coord[524] = 0;
	color[522] = 0.0104428;
	color[523] = 0;
	color[524] = 0.989557;

	coord[525] = -0.426463;
	coord[526] = 0.225934;
	coord[527] = 0;
	color[525] = 0.00994811;
	color[526] = 0;
	color[527] = 0.990052;

	coord[528] = 0.0247015;
	coord[529] = -0.0607912;
	coord[530] = 0;
	color[528] = 0.0111369;
	color[529] = 0;
	color[530] = 0.988863;

	coord[531] = -0.125068;
	coord[532] = 0.00707781;
	coord[533] = 0;
	color[531] = 0.0107689;
	color[532] = 0;
	color[533] = 0.989231;

	coord[534] = 0.499513;
	coord[535] = -0.0804876;
	coord[536] = 0;
	color[534] = 0.0121366;
	color[535] = 0;
	color[536] = 0.987863;

	coord[537] = -0.394859;
	coord[538] = -0.150178;
	coord[539] = 0;
	color[537] = 0.0107937;
	color[538] = 0;
	color[539] = 0.989206;

	coord[540] = 0.247191;
	coord[541] = -0.103231;
	coord[542] = 0;
	color[540] = 0.0123694;
	color[541] = 0;
	color[542] = 0.987631;

	coord[543] = -0.61912;
	coord[544] = 0.187979;
	coord[545] = 0;
	color[543] = 0.00837999;
	color[544] = 0;
	color[545] = 0.99162;

	coord[546] = 0.555988;
	coord[547] = 0.373587;
	coord[548] = 0;
	color[546] = 0.0122946;
	color[547] = 0;
	color[548] = 0.987705;

	coord[549] = -0.521779;
	coord[550] = 0.381068;
	coord[551] = 0;
	color[549] = 0.00485653;
	color[550] = 0;
	color[551] = 0.995143;

	coord[552] = -0.273561;
	coord[553] = 0.0032644;
	coord[554] = 0;
	color[552] = 0.0108411;
	color[553] = 0;
	color[554] = 0.989159;

	coord[555] = -0.611946;
	coord[556] = -0.0579704;
	coord[557] = 0;
	color[555] = 0.0106165;
	color[556] = 0;
	color[557] = 0.989383;

	coord[558] = -0.167187;
	coord[559] = -0.156524;
	coord[560] = 0;
	color[558] = 0.0120783;
	color[559] = 0;
	color[560] = 0.987922;

	coord[561] = 0.554695;
	coord[562] = 0.167737;
	coord[563] = 0;
	color[561] = 0.0123863;
	color[562] = 0;
	color[563] = 0.987614;

	coord[564] = -0.688772;
	coord[565] = 0.369158;
	coord[566] = 0;
	color[564] = 0.0094003;
	color[565] = 0;
	color[566] = 0.9906;

	coord[567] = -0.442334;
	coord[568] = 0.0553614;
	coord[569] = 0;
	color[567] = 0.00984812;
	color[568] = 0;
	color[569] = 0.990152;

	coord[570] = -1;
	coord[571] = 0.227217;
	coord[572] = 0.25605;
	color[570] = 0.236462;
	color[571] = 0;
	color[572] = 0.763538;

	coord[573] = -1;
	coord[574] = -0.0116947;
	coord[575] = 0.224052;
	color[573] = 0.261791;
	color[574] = 0;
	color[575] = 0.738209;

	coord[576] = -1;
	coord[577] = -0.265348;
	coord[578] = 0.196836;
	color[576] = 0.264108;
	color[577] = 0;
	color[578] = 0.735892;

	coord[579] = -1;
	coord[580] = -0.480988;
	coord[581] = 0.160309;
	color[579] = 0.227421;
	color[580] = 0;
	color[581] = 0.772579;

	coord[582] = -1;
	coord[583] = -0.447568;
	coord[584] = 0.359149;
	color[582] = 0.496306;
	color[583] = 0;
	color[584] = 0.503694;

	coord[585] = -1;
	coord[586] = 0.26898;
	coord[587] = 0.477098;
	color[585] = 0.434155;
	color[586] = 0;
	color[587] = 0.565845;

	coord[588] = -1;
	coord[589] = 0.0613582;
	coord[590] = 0.452876;
	color[588] = 0.519587;
	color[589] = 0;
	color[590] = 0.480413;

	coord[591] = -1;
	coord[592] = -0.19117;
	coord[593] = 0.426507;
	color[591] = 0.556801;
	color[592] = 0;
	color[593] = 0.443199;

	coord[594] = -1;
	coord[595] = 0.451995;
	coord[596] = 0.347259;
	color[594] = 0.178311;
	color[595] = 0;
	color[596] = 0.821689;

	coord[597] = -0.565262;
	coord[598] = -0.666667;
	coord[599] = 0.22416;
	color[597] = 0.320809;
	color[598] = 0;
	color[599] = 0.679191;

	coord[600] = -0.327548;
	coord[601] = -0.666667;
	coord[602] = 0.342038;
	color[600] = 0.491442;
	color[601] = 0;
	color[602] = 0.508558;

	coord[603] = 0.0124734;
	coord[604] = -0.666667;
	coord[605] = 0.329482;
	color[603] = 0.48305;
	color[604] = 0;
	color[605] = 0.51695;

	coord[606] = 0.330442;
	coord[607] = -0.666667;
	coord[608] = 0.309297;
	color[606] = 0.461984;
	color[607] = 0;
	color[608] = 0.538016;

	coord[609] = 0.63018;
	coord[610] = -0.666667;
	coord[611] = 0.242031;
	color[609] = 0.367518;
	color[610] = 0;
	color[611] = 0.632482;

	coord[612] = 0.767409;
	coord[613] = -0.666667;
	coord[614] = 0.428033;
	color[612] = 0.643648;
	color[613] = 0;
	color[614] = 0.356352;

	coord[615] = -0.584623;
	coord[616] = -0.666667;
	coord[617] = 0.447744;
	color[615] = 0.635791;
	color[616] = 0;
	color[617] = 0.364209;

	coord[618] = -0.780818;
	coord[619] = -0.666667;
	coord[620] = 0.340013;
	color[618] = 0.478569;
	color[619] = 0;
	color[620] = 0.521431;

	coord[621] = 1;
	coord[622] = -0.231524;
	coord[623] = 0.205826;
	color[621] = 0.315552;
	color[622] = 0;
	color[623] = 0.684448;

	coord[624] = 1;
	coord[625] = 0.0279308;
	coord[626] = 0.255006;
	color[624] = 0.388137;
	color[625] = 0;
	color[626] = 0.611863;

	coord[627] = 1;
	coord[628] = 0.325056;
	coord[629] = 0.21367;
	color[627] = 0.327434;
	color[628] = 0;
	color[629] = 0.672566;

	coord[630] = 1;
	coord[631] = 0.455425;
	coord[632] = 0.393414;
	color[630] = 0.593531;
	color[631] = 0;
	color[632] = 0.406469;

	coord[633] = 1;
	coord[634] = -0.190107;
	coord[635] = 0.435172;
	color[633] = 0.654491;
	color[634] = 0;
	color[635] = 0.345509;

	coord[636] = 1;
	coord[637] = 0.0243325;
	coord[638] = 0.493446;
	color[636] = 0.741033;
	color[637] = 0;
	color[638] = 0.258967;

	coord[639] = 1;
	coord[640] = 0.234561;
	coord[641] = 0.445427;
	color[639] = 0.670199;
	color[640] = 0;
	color[641] = 0.329801;

	coord[642] = 1;
	coord[643] = -0.434845;
	coord[644] = 0.330441;
	color[642] = 0.499853;
	color[643] = 0;
	color[644] = 0.500147;

	coord[645] = 0.127161;
	coord[646] = 0.266667;
	coord[647] = 0.281851;
	color[645] = 0.40375;
	color[646] = 0;
	color[647] = 0.59625;

	coord[648] = 0.0928964;
	coord[649] = 0.266667;
	coord[650] = 0.46083;
	color[648] = 0.653068;
	color[649] = 0;
	color[650] = 0.346932;

	coord[651] = 0.0316205;
	coord[652] = 0.266667;
	coord[653] = 0.145729;
	color[651] = 0.207268;
	color[652] = 0;
	color[653] = 0.792732;

	coord[654] = -0.127261;
	coord[655] = 0.266667;
	coord[656] = 0.143815;
	color[654] = 0.187977;
	color[655] = 0;
	color[656] = 0.812023;

	coord[657] = -0.158687;
	coord[658] = 0.266667;
	coord[659] = 0.274808;
	color[657] = 0.339341;
	color[658] = 0;
	color[659] = 0.660659;

	coord[660] = -0.109311;
	coord[661] = 0.266667;
	coord[662] = 0.455097;
	color[660] = 0.593738;
	color[661] = 0;
	color[662] = 0.406262;

	coord[663] = -0.0227618;
	coord[664] = 0.266667;
	coord[665] = 0.290741;
	color[663] = 0.395509;
	color[664] = 0;
	color[665] = 0.604491;

	coord[666] = -0.266667;
	coord[667] = 0.461991;
	coord[668] = 0.207668;
	color[666] = 0.107694;
	color[667] = 0;
	color[668] = 0.892306;

	coord[669] = -0.266667;
	coord[670] = 0.463884;
	coord[671] = 0.473385;
	color[669] = 0.28008;
	color[670] = 0;
	color[671] = 0.71992;

	coord[672] = 0.266667;
	coord[673] = 0.470724;
	coord[674] = 0.255349;
	color[672] = 0.386117;
	color[673] = 0;
	color[674] = 0.613883;

	coord[675] = 0.266667;
	coord[676] = 0.482893;
	coord[677] = 0.411003;
	color[675] = 0.615151;
	color[676] = 0;
	color[677] = 0.384849;

	coord[678] = 0.266667;
	coord[679] = 0.514575;
	coord[680] = 0.557496;
	color[678] = 0.832673;
	color[679] = 0;
	color[680] = 0.167327;

	coord[681] = 0.266667;
	coord[682] = 0.466183;
	coord[683] = 0.114758;
	color[681] = 0.180106;
	color[682] = 0;
	color[683] = 0.819894;

	coord[684] = -0.503331;
	coord[685] = -0.186242;
	coord[686] = 0.421953;
	color[684] = 0.565321;
	color[685] = 0;
	color[686] = 0.434679;

	coord[687] = 0.49371;
	coord[688] = -0.243295;
	coord[689] = 0.41187;
	color[687] = 0.614555;
	color[688] = 0;
	color[689] = 0.385445;

	coord[690] = 0.0416062;
	coord[691] = -0.216287;
	coord[692] = 0.317985;
	color[690] = 0.460024;
	color[691] = 0;
	color[692] = 0.539976;

	coord[693] = 0.801931;
	coord[694] = 0.189115;
	coord[695] = 0.256085;
	color[693] = 0.38927;
	color[694] = 0;
	color[695] = 0.61073;

	coord[696] = 0.700934;
	coord[697] = 0.427239;
	coord[698] = 0.442125;
	color[696] = 0.664346;
	color[697] = 0;
	color[698] = 0.335654;

	coord[699] = -0.695195;
	coord[700] = 0.43133;
	coord[701] = 0.451634;
	color[699] = 0.282525;
	color[700] = 0;
	color[701] = 0.717475;

	coord[702] = -0.554444;
	coord[703] = 0.314966;
	coord[704] = 0.155035;
	color[702] = 0.123868;
	color[703] = 0;
	color[704] = 0.876132;

	coord[705] = -0.504809;
	coord[706] = 0.100023;
	coord[707] = 0.241974;
	color[705] = 0.27403;
	color[706] = 0;
	color[707] = 0.72597;

	coord[708] = -0.484166;
	coord[709] = 0.357977;
	coord[710] = 0.489427;
	color[708] = 0.404949;
	color[709] = 0;
	color[710] = 0.595051;

	coord[711] = -0.324854;
	coord[712] = 0.0878198;
	coord[713] = 0.496835;
	color[711] = 0.616591;
	color[712] = 0;
	color[713] = 0.383409;

	coord[714] = 0.187043;
	coord[715] = -0.0819871;
	coord[716] = 0.257375;
	color[714] = 0.37712;
	color[715] = 0;
	color[716] = 0.62288;

	coord[717] = 0.392339;
	coord[718] = 0.0380324;
	coord[719] = 0.198634;
	color[717] = 0.299392;
	color[718] = 0;
	color[719] = 0.700608;

	coord[720] = -0.0599222;
	coord[721] = -0.13646;
	coord[722] = 0.194422;
	color[720] = 0.278438;
	color[721] = 0;
	color[722] = 0.721562;

	coord[723] = -0.101575;
	coord[724] = -0.407236;
	coord[725] = 0.28875;
	color[723] = 0.417194;
	color[724] = 0;
	color[725] = 0.582806;

	coord[726] = -0.0972781;
	coord[727] = -0.185204;
	coord[728] = 0.448121;
	color[726] = 0.63416;
	color[727] = 0;
	color[728] = 0.36584;

	coord[729] = 0.153527;
	coord[730] = -0.32218;
	coord[731] = 0.187838;
	color[729] = 0.280618;
	color[730] = 0;
	color[731] = 0.719382;

	coord[732] = 0.153433;
	coord[733] = -0.31016;
	coord[734] = 0.439083;
	color[732] = 0.643656;
	color[733] = 0;
	color[734] = 0.356344;

	coord[735] = 0.160167;
	coord[736] = 0.122469;
	coord[737] = 0.239177;
	color[735] = 0.347415;
	color[736] = 0;
	color[737] = 0.652585;

	coord[738] = -0.267344;
	coord[739] = 0.0649115;
	coord[740] = 0.14084;
	color[738] = 0.181236;
	color[739] = 0;
	color[740] = 0.818764;

	coord[741] = -0.797921;
	coord[742] = 0.148469;
	coord[743] = 0.326323;
	color[741] = 0.340185;
	color[742] = 0;
	color[743] = 0.659815;

	coord[744] = -0.804903;
	coord[745] = -0.0950296;
	coord[746] = 0.22742;
	color[744] = 0.284478;
	color[745] = 0;
	color[746] = 0.715522;

	coord[747] = -0.785794;
	coord[748] = -0.37844;
	coord[749] = 0.206341;
	color[747] = 0.287411;
	color[748] = 0;
	color[749] = 0.712589;

	coord[750] = -0.690727;
	coord[751] = -0.048795;
	coord[752] = 0.447929;
	color[750] = 0.559272;
	color[751] = 0;
	color[752] = 0.440728;

	coord[753] = -0.561314;
	coord[754] = -0.158933;
	coord[755] = 0.185971;
	color[753] = 0.246369;
	color[754] = 0;
	color[755] = 0.753631;

	coord[756] = -0.521605;
	coord[757] = 0.110955;
	coord[758] = 0.458079;
	color[756] = 0.525382;
	color[757] = 0;
	color[758] = 0.474618;

	coord[759] = -0.0572162;
	coord[760] = 0.0874514;
	coord[761] = 0.232501;
	color[759] = 0.318618;
	color[760] = 0;
	color[761] = 0.681382;

	coord[762] = -0.112005;
	coord[763] = 0.0468283;
	coord[764] = 0.484823;
	color[762] = 0.656464;
	color[763] = 0;
	color[764] = 0.343536;

	coord[765] = 0.159074;
	coord[766] = 0.129911;
	coord[767] = 0.478968;
	color[765] = 0.689477;
	color[766] = 0;
	color[767] = 0.310523;

	coord[768] = -0.369879;
	coord[769] = -0.177563;
	coord[770] = 0.275956;
	color[768] = 0.374529;
	color[769] = 0;
	color[770] = 0.625471;

	coord[771] = -0.372706;
	coord[772] = -0.42136;
	coord[773] = 0.18823;
	color[771] = 0.270778;
	color[772] = 0;
	color[773] = 0.729222;

	coord[774] = -0.516326;
	coord[775] = -0.426285;
	coord[776] = 0.375276;
	color[774] = 0.524835;
	color[775] = 0;
	color[776] = 0.475165;

	coord[777] = -0.279662;
	coord[778] = -0.325907;
	coord[779] = 0.436787;
	color[777] = 0.616635;
	color[778] = 0;
	color[779] = 0.383365;

	coord[780] = -0.322492;
	coord[781] = -0.107757;
	coord[782] = 0.488948;
	color[780] = 0.656583;
	color[781] = 0;
	color[782] = 0.343417;

	coord[783] = 0.593729;
	coord[784] = 0.316421;
	coord[785] = 0.321585;
	color[783] = 0.484659;
	color[784] = 0;
	color[785] = 0.515341;

	coord[786] = 0.635891;
	coord[787] = 0.0568937;
	coord[788] = 0.276775;
	color[786] = 0.418124;
	color[787] = 0;
	color[788] = 0.581876;

	coord[789] = 0.550864;
	coord[790] = -0.135808;
	coord[791] = 0.279903;
	color[789] = 0.421811;
	color[790] = 0;
	color[791] = 0.578189;

	coord[792] = 0.529246;
	coord[793] = -0.388229;
	coord[794] = 0.211576;
	color[792] = 0.321554;
	color[793] = 0;
	color[794] = 0.678446;

	coord[795] = 0.354425;
	coord[796] = -0.257145;
	coord[797] = 0.228021;
	color[795] = 0.342454;
	color[796] = 0;
	color[797] = 0.657546;

	coord[798] = 0.689867;
	coord[799] = -0.327234;
	coord[800] = 0.451869;
	color[798] = 0.677536;
	color[799] = 0;
	color[800] = 0.322464;

	coord[801] = 0.545869;
	coord[802] = -0.0944466;
	coord[803] = 0.490715;
	color[801] = 0.731679;
	color[802] = 0;
	color[803] = 0.268321;

	coord[804] = 0.339789;
	coord[805] = -0.142259;
	coord[806] = 0.372158;
	color[804] = 0.550928;
	color[805] = 0;
	color[806] = 0.449072;

	coord[807] = 0.558261;
	coord[808] = 0.0867844;
	coord[809] = 0.526741;
	color[807] = 0.785462;
	color[808] = 0;
	color[809] = 0.214538;

	coord[810] = 0.712525;
	coord[811] = 0.183591;
	coord[812] = 0.47633;
	color[810] = 0.714243;
	color[811] = 0;
	color[812] = 0.285757;

	coord[813] = 0.515951;
	coord[814] = 0.314488;
	coord[815] = 0.497443;
	color[813] = 0.743025;
	color[814] = 0;
	color[815] = 0.256975;

	coord[816] = 0.306651;
	coord[817] = 0.107479;
	coord[818] = 0.368318;
	color[816] = 0.54212;
	color[817] = 0;
	color[818] = 0.45788;

	coord[819] = 0.756389;
	coord[820] = -0.0646102;
	coord[821] = 0.473603;
	color[819] = 0.710149;
	color[820] = 0;
	color[821] = 0.289851;

	coord[822] = 0.420055;
	coord[823] = -0.410612;
	coord[824] = 0.457782;
	color[822] = 0.681599;
	color[823] = 0;
	color[824] = 0.318401;

	coord[825] = -0.74976;
	coord[826] = -0.361524;
	coord[827] = 0.466266;
	color[825] = 0.642048;
	color[826] = 0;
	color[827] = 0.357952;

	coord[828] = 0.789315;
	coord[829] = -0.119575;
	coord[830] = 0.22189;
	color[828] = 0.338606;
	color[829] = 0;
	color[830] = 0.661394;

	coord[831] = 0.00220068;
	coord[832] = 0.149046;
	coord[833] = 0.54253;
	color[831] = 0.755849;
	color[832] = 0;
	color[833] = 0.244151;

	coord[834] = 0.80182;
	coord[835] = -0.398702;
	coord[836] = 0.224453;
	color[834] = 0.342788;
	color[835] = 0;
	color[836] = 0.657212;

	coord[837] = -0.169381;
	coord[838] = 0.157601;
	coord[839] = 0.551553;
	color[837] = 0.714389;
	color[838] = 0;
	color[839] = 0.285611;

	coord[840] = -0.646278;
	coord[841] = 0.203153;
	coord[842] = 0.526726;
	color[840] = 0.547791;
	color[841] = 0;
	color[842] = 0.452209;

	coord[843] = -0.425832;
	coord[844] = 0.213293;
	coord[845] = 0.5393;
	color[843] = 0.583647;
	color[844] = 0;
	color[845] = 0.416353;

	coord[846] = -0.46975;
	coord[847] = -0.0292348;
	coord[848] = 0.529146;
	color[846] = 0.679958;
	color[847] = 0;
	color[848] = 0.320042;

	coord[849] = -0.203455;
	coord[850] = 0.131346;
	coord[851] = 0.376783;
	color[849] = 0.474776;
	color[850] = 0;
	color[851] = 0.525224;

	coord[852] = -0.240246;
	coord[853] = 0.161473;
	coord[854] = 0.237742;
	color[852] = 0.288723;
	color[853] = 0;
	color[854] = 0.711277;

	coord[855] = -0.109993;
	coord[856] = 0.162781;
	coord[857] = 0.251268;
	color[855] = 0.329658;
	color[856] = 0;
	color[857] = 0.670342;

	coord[858] = -0.411757;
	coord[859] = 0.193436;
	coord[860] = 0.298154;
	color[858] = 0.315179;
	color[859] = 0;
	color[860] = 0.684821;

	coord[861] = -0.318941;
	coord[862] = 0.0294184;
	coord[863] = 0.281031;
	color[861] = 0.354603;
	color[862] = 0;
	color[863] = 0.645397;

	coord[864] = 0.397059;
	coord[865] = 0.438273;
	coord[866] = 0.519467;
	color[864] = 0.775246;
	color[865] = 0;
	color[866] = 0.224754;

	coord[867] = 0.404742;
	coord[868] = 0.171556;
	coord[869] = 0.481624;
	color[867] = 0.713918;
	color[868] = 0;
	color[869] = 0.286082;

	coord[870] = 0.40589;
	coord[871] = 0.304476;
	coord[872] = 0.328746;
	color[870] = 0.491281;
	color[871] = 0;
	color[872] = 0.508719;

	coord[873] = 0.495374;
	coord[874] = 0.13069;
	coord[875] = 0.364803;
	color[873] = 0.545024;
	color[874] = 0;
	color[875] = 0.454976;

	coord[876] = 0.219451;
	coord[877] = -0.0520408;
	coord[878] = 0.489104;
	color[876] = 0.71329;
	color[877] = 0;
	color[878] = 0.28671;

	coord[879] = 0.403353;
	coord[880] = 0.00942245;
	coord[881] = 0.476097;
	color[879] = 0.704792;
	color[880] = 0;
	color[881] = 0.295208;

	coord[882] = 0.332683;
	coord[883] = -0.170792;
	coord[884] = 0.532383;
	color[882] = 0.786007;
	color[883] = 0;
	color[884] = 0.213993;

	coord[885] = 0.0396732;
	coord[886] = -0.0439138;
	coord[887] = 0.442124;
	color[885] = 0.628183;
	color[886] = 0;
	color[887] = 0.371817;

	coord[888] = 0.283016;
	coord[889] = 0.0908006;
	coord[890] = 0.545525;
	color[888] = 0.79979;
	color[889] = 0;
	color[890] = 0.20021;

	coord[891] = 0.51489;
	coord[892] = 0.552771;
	coord[893] = 0.519703;
	color[891] = 0.778266;
	color[892] = 0;
	color[893] = 0.221734;

	coord[894] = -0.219581;
	coord[895] = 0.167261;
	coord[896] = 0.117726;
	color[894] = 0.146661;
	color[895] = 0;
	color[896] = 0.853339;

	coord[897] = 0.000631187;
	coord[898] = 0.154319;
	coord[899] = 0.190438;
	color[897] = 0.266523;
	color[898] = 0;
	color[899] = 0.733477;

	coord[900] = 0.019632;
	coord[901] = 0.014309;
	coord[902] = 0.185948;
	color[900] = 0.265396;
	color[901] = 0;
	color[902] = 0.734604;

	coord[903] = -0.00153387;
	coord[904] = 0.122563;
	coord[905] = 0.348045;
	color[903] = 0.482501;
	color[904] = 0;
	color[905] = 0.517499;

	coord[906] = -0.68614;
	coord[907] = 0.229676;
	coord[908] = 0.15282;
	color[906] = 0.142269;
	color[907] = 0;
	color[908] = 0.857731;

	coord[909] = -0.49933;
	coord[910] = 0.166133;
	coord[911] = 0.131966;
	color[909] = 0.143212;
	color[910] = 0;
	color[911] = 0.856788;

	coord[912] = -0.617387;
	coord[913] = 0.040616;
	coord[914] = 0.175966;
	color[912] = 0.204708;
	color[913] = 0;
	color[914] = 0.795292;

	coord[915] = -0.594024;
	coord[916] = 0.159146;
	coord[917] = 0.315456;
	color[915] = 0.330594;
	color[916] = 0;
	color[917] = 0.669406;

	coord[918] = -0.401514;
	coord[919] = 0.349086;
	coord[920] = 0.150315;
	color[918] = 0.116173;
	color[919] = 0;
	color[920] = 0.883827;

	coord[921] = -0.84458;
	coord[922] = 0.329422;
	coord[923] = 0.19189;
	color[921] = 0.144177;
	color[922] = 0;
	color[923] = 0.855823;

	coord[924] = -0.691587;
	coord[925] = 0.477741;
	coord[926] = 0.211074;
	color[924] = 0.0999325;
	color[925] = 0;
	color[926] = 0.900067;

	coord[927] = -0.624982;
	coord[928] = 0.321232;
	coord[929] = 0.315643;
	color[927] = 0.246284;
	color[928] = 0;
	color[929] = 0.753716;

	coord[930] = -0.515491;
	coord[931] = 0.502225;
	coord[932] = 0.142337;
	color[930] = 0.056465;
	color[931] = 0;
	color[932] = 0.943535;

	coord[933] = -0.462169;
	coord[934] = 0.454011;
	coord[935] = 0.311837;
	color[933] = 0.174267;
	color[934] = 0;
	color[935] = 0.825733;

	coord[936] = -0.427202;
	coord[937] = 0.0551308;
	coord[938] = 0.168757;
	color[936] = 0.205034;
	color[937] = 0;
	color[938] = 0.794966;

	coord[939] = -0.473305;
	coord[940] = -0.0103305;
	coord[941] = 0.331853;
	color[939] = 0.412721;
	color[940] = 0;
	color[941] = 0.587279;

	coord[942] = -0.126661;
	coord[943] = 0.0751479;
	coord[944] = 0.139293;
	color[942] = 0.190521;
	color[943] = 0;
	color[944] = 0.809479;

	coord[945] = -0.128357;
	coord[946] = 0.0206524;
	coord[947] = 0.287316;
	color[945] = 0.38801;
	color[946] = 0;
	color[947] = 0.61199;

	coord[948] = -0.352507;
	coord[949] = 0.169384;
	coord[950] = 0.158408;
	color[948] = 0.178221;
	color[949] = 0;
	color[950] = 0.821779;

	coord[951] = -0.211738;
	coord[952] = -0.0628913;
	coord[953] = 0.169921;
	color[951] = 0.232982;
	color[952] = 0;
	color[953] = 0.767018;

	coord[954] = -0.352265;
	coord[955] = -0.0552346;
	coord[956] = 0.127972;
	color[954] = 0.171864;
	color[955] = 0;
	color[956] = 0.828136;

	coord[957] = -0.223489;
	coord[958] = -0.242503;
	coord[959] = 0.18086;
	color[957] = 0.257368;
	color[958] = 0;
	color[959] = 0.742632;

	coord[960] = -0.220617;
	coord[961] = -0.0810903;
	coord[962] = 0.350486;
	color[960] = 0.476815;
	color[961] = 0;
	color[962] = 0.523185;

	coord[963] = 0.37787;
	coord[964] = 0.545546;
	coord[965] = 0.14357;
	color[963] = 0.222792;
	color[964] = 0;
	color[965] = 0.777208;

	coord[966] = 0.453834;
	coord[967] = 0.495295;
	coord[968] = 0.324216;
	color[966] = 0.488317;
	color[967] = 0;
	color[968] = 0.511683;

	coord[969] = 0.799529;
	coord[970] = 0.452771;
	coord[971] = 0.210293;
	color[969] = 0.322404;
	color[970] = 0;
	color[971] = 0.677596;

	coord[972] = 0.486597;
	coord[973] = 0.431473;
	coord[974] = 0.153748;
	color[972] = 0.237583;
	color[973] = 0;
	color[974] = 0.762417;

	coord[975] = 0.612831;
	coord[976] = 0.488031;
	coord[977] = 0.169946;
	color[975] = 0.262189;
	color[976] = 0;
	color[977] = 0.737811;

	coord[978] = 0.53157;
	coord[979] = 0.260559;
	coord[980] = 0.159166;
	color[978] = 0.24521;
	color[979] = 0;
	color[980] = 0.75479;

	coord[981] = 0.366012;
	coord[982] = 0.388343;
	coord[983] = 0.153435;
	color[981] = 0.235704;
	color[982] = 0;
	color[983] = 0.764296;

	let indices = new Uint16Array(1356);

	indices[0] = 16;
	indices[1] = 0;
	indices[2] = 19;
	indices[3] = 17;
	indices[4] = 16;
	indices[5] = 89;
	indices[6] = 18;
	indices[7] = 17;
	indices[8] = 90;
	indices[9] = 17;
	indices[10] = 89;
	indices[11] = 90;
	indices[12] = 1;
	indices[13] = 18;
	indices[14] = 24;
	indices[15] = 24;
	indices[16] = 18;
	indices[17] = 90;
	indices[18] = 19;
	indices[19] = 20;
	indices[20] = 91;
	indices[21] = 20;
	indices[22] = 21;
	indices[23] = 92;
	indices[24] = 20;
	indices[25] = 92;
	indices[26] = 91;
	indices[27] = 21;
	indices[28] = 2;
	indices[29] = 93;
	indices[30] = 92;
	indices[31] = 21;
	indices[32] = 93;
	indices[33] = 2;
	indices[34] = 23;
	indices[35] = 93;
	indices[36] = 22;
	indices[37] = 3;
	indices[38] = 26;
	indices[39] = 23;
	indices[40] = 22;
	indices[41] = 94;
	indices[42] = 22;
	indices[43] = 26;
	indices[44] = 94;
	indices[45] = 25;
	indices[46] = 24;
	indices[47] = 90;
	indices[48] = 26;
	indices[49] = 25;
	indices[50] = 94;
	indices[51] = 93;
	indices[52] = 23;
	indices[53] = 94;
	indices[54] = 25;
	indices[55] = 90;
	indices[56] = 94;
	indices[57] = 16;
	indices[58] = 19;
	indices[59] = 89;
	indices[60] = 92;
	indices[61] = 93;
	indices[62] = 94;
	indices[63] = 91;
	indices[64] = 92;
	indices[65] = 95;
	indices[66] = 90;
	indices[67] = 89;
	indices[68] = 95;
	indices[69] = 92;
	indices[70] = 94;
	indices[71] = 95;
	indices[72] = 19;
	indices[73] = 91;
	indices[74] = 89;
	indices[75] = 89;
	indices[76] = 91;
	indices[77] = 95;
	indices[78] = 94;
	indices[79] = 90;
	indices[80] = 95;
	indices[81] = 4;
	indices[82] = 27;
	indices[83] = 37;
	indices[84] = 27;
	indices[85] = 28;
	indices[86] = 96;
	indices[87] = 28;
	indices[88] = 29;
	indices[89] = 97;
	indices[90] = 28;
	indices[91] = 97;
	indices[92] = 96;
	indices[93] = 29;
	indices[94] = 5;
	indices[95] = 98;
	indices[96] = 97;
	indices[97] = 29;
	indices[98] = 98;
	indices[99] = 5;
	indices[100] = 32;
	indices[101] = 98;
	indices[102] = 30;
	indices[103] = 6;
	indices[104] = 33;
	indices[105] = 31;
	indices[106] = 30;
	indices[107] = 99;
	indices[108] = 32;
	indices[109] = 31;
	indices[110] = 100;
	indices[111] = 98;
	indices[112] = 32;
	indices[113] = 100;
	indices[114] = 31;
	indices[115] = 99;
	indices[116] = 100;
	indices[117] = 30;
	indices[118] = 33;
	indices[119] = 99;
	indices[120] = 34;
	indices[121] = 7;
	indices[122] = 35;
	indices[123] = 35;
	indices[124] = 36;
	indices[125] = 101;
	indices[126] = 37;
	indices[127] = 27;
	indices[128] = 96;
	indices[129] = 34;
	indices[130] = 35;
	indices[131] = 101;
	indices[132] = 33;
	indices[133] = 34;
	indices[134] = 102;
	indices[135] = 33;
	indices[136] = 102;
	indices[137] = 99;
	indices[138] = 37;
	indices[139] = 96;
	indices[140] = 36;
	indices[141] = 34;
	indices[142] = 101;
	indices[143] = 102;
	indices[144] = 36;
	indices[145] = 96;
	indices[146] = 101;
	indices[147] = 97;
	indices[148] = 98;
	indices[149] = 100;
	indices[150] = 101;
	indices[151] = 96;
	indices[152] = 103;
	indices[153] = 102;
	indices[154] = 101;
	indices[155] = 103;
	indices[156] = 96;
	indices[157] = 97;
	indices[158] = 103;
	indices[159] = 99;
	indices[160] = 102;
	indices[161] = 103;
	indices[162] = 99;
	indices[163] = 103;
	indices[164] = 100;
	indices[165] = 97;
	indices[166] = 100;
	indices[167] = 103;
	indices[168] = 38;
	indices[169] = 8;
	indices[170] = 104;
	indices[171] = 39;
	indices[172] = 38;
	indices[173] = 105;
	indices[174] = 38;
	indices[175] = 104;
	indices[176] = 105;
	indices[177] = 40;
	indices[178] = 39;
	indices[179] = 106;
	indices[180] = 39;
	indices[181] = 105;
	indices[182] = 106;
	indices[183] = 9;
	indices[184] = 40;
	indices[185] = 107;
	indices[186] = 40;
	indices[187] = 106;
	indices[188] = 107;
	indices[189] = 41;
	indices[190] = 1;
	indices[191] = 24;
	indices[192] = 42;
	indices[193] = 41;
	indices[194] = 108;
	indices[195] = 8;
	indices[196] = 42;
	indices[197] = 109;
	indices[198] = 42;
	indices[199] = 108;
	indices[200] = 109;
	indices[201] = 24;
	indices[202] = 25;
	indices[203] = 110;
	indices[204] = 25;
	indices[205] = 26;
	indices[206] = 111;
	indices[207] = 25;
	indices[208] = 111;
	indices[209] = 110;
	indices[210] = 26;
	indices[211] = 3;
	indices[212] = 112;
	indices[213] = 111;
	indices[214] = 26;
	indices[215] = 112;
	indices[216] = 3;
	indices[217] = 43;
	indices[218] = 112;
	indices[219] = 43;
	indices[220] = 44;
	indices[221] = 113;
	indices[222] = 43;
	indices[223] = 113;
	indices[224] = 112;
	indices[225] = 44;
	indices[226] = 45;
	indices[227] = 114;
	indices[228] = 44;
	indices[229] = 114;
	indices[230] = 113;
	indices[231] = 46;
	indices[232] = 10;
	indices[233] = 47;
	indices[234] = 47;
	indices[235] = 48;
	indices[236] = 115;
	indices[237] = 48;
	indices[238] = 49;
	indices[239] = 116;
	indices[240] = 48;
	indices[241] = 116;
	indices[242] = 115;
	indices[243] = 49;
	indices[244] = 50;
	indices[245] = 117;
	indices[246] = 50;
	indices[247] = 51;
	indices[248] = 118;
	indices[249] = 50;
	indices[250] = 118;
	indices[251] = 117;
	indices[252] = 51;
	indices[253] = 52;
	indices[254] = 119;
	indices[255] = 51;
	indices[256] = 119;
	indices[257] = 118;
	indices[258] = 52;
	indices[259] = 11;
	indices[260] = 53;
	indices[261] = 53;
	indices[262] = 54;
	indices[263] = 120;
	indices[264] = 54;
	indices[265] = 55;
	indices[266] = 121;
	indices[267] = 55;
	indices[268] = 56;
	indices[269] = 122;
	indices[270] = 56;
	indices[271] = 6;
	indices[272] = 123;
	indices[273] = 122;
	indices[274] = 56;
	indices[275] = 123;
	indices[276] = 6;
	indices[277] = 30;
	indices[278] = 123;
	indices[279] = 30;
	indices[280] = 31;
	indices[281] = 124;
	indices[282] = 30;
	indices[283] = 124;
	indices[284] = 123;
	indices[285] = 31;
	indices[286] = 32;
	indices[287] = 124;
	indices[288] = 32;
	indices[289] = 5;
	indices[290] = 58;
	indices[291] = 57;
	indices[292] = 9;
	indices[293] = 125;
	indices[294] = 58;
	indices[295] = 57;
	indices[296] = 126;
	indices[297] = 57;
	indices[298] = 125;
	indices[299] = 126;
	indices[300] = 41;
	indices[301] = 24;
	indices[302] = 108;
	indices[303] = 46;
	indices[304] = 47;
	indices[305] = 115;
	indices[306] = 32;
	indices[307] = 58;
	indices[308] = 126;
	indices[309] = 9;
	indices[310] = 107;
	indices[311] = 127;
	indices[312] = 8;
	indices[313] = 109;
	indices[314] = 128;
	indices[315] = 24;
	indices[316] = 110;
	indices[317] = 108;
	indices[318] = 52;
	indices[319] = 53;
	indices[320] = 129;
	indices[321] = 116;
	indices[322] = 49;
	indices[323] = 117;
	indices[324] = 45;
	indices[325] = 46;
	indices[326] = 130;
	indices[327] = 32;
	indices[328] = 126;
	indices[329] = 124;
	indices[330] = 121;
	indices[331] = 55;
	indices[332] = 122;
	indices[333] = 120;
	indices[334] = 54;
	indices[335] = 121;
	indices[336] = 125;
	indices[337] = 9;
	indices[338] = 127;
	indices[339] = 104;
	indices[340] = 8;
	indices[341] = 128;
	indices[342] = 130;
	indices[343] = 46;
	indices[344] = 115;
	indices[345] = 130;
	indices[346] = 115;
	indices[347] = 131;
	indices[348] = 115;
	indices[349] = 116;
	indices[350] = 131;
	indices[351] = 106;
	indices[352] = 105;
	indices[353] = 132;
	indices[354] = 107;
	indices[355] = 106;
	indices[356] = 133;
	indices[357] = 106;
	indices[358] = 132;
	indices[359] = 133;
	indices[360] = 109;
	indices[361] = 108;
	indices[362] = 134;
	indices[363] = 108;
	indices[364] = 110;
	indices[365] = 134;
	indices[366] = 111;
	indices[367] = 112;
	indices[368] = 135;
	indices[369] = 110;
	indices[370] = 111;
	indices[371] = 135;
	indices[372] = 112;
	indices[373] = 113;
	indices[374] = 135;
	indices[375] = 129;
	indices[376] = 53;
	indices[377] = 120;
	indices[378] = 113;
	indices[379] = 114;
	indices[380] = 136;
	indices[381] = 114;
	indices[382] = 45;
	indices[383] = 130;
	indices[384] = 124;
	indices[385] = 126;
	indices[386] = 125;
	indices[387] = 124;
	indices[388] = 125;
	indices[389] = 137;
	indices[390] = 118;
	indices[391] = 119;
	indices[392] = 138;
	indices[393] = 117;
	indices[394] = 118;
	indices[395] = 139;
	indices[396] = 119;
	indices[397] = 52;
	indices[398] = 129;
	indices[399] = 125;
	indices[400] = 127;
	indices[401] = 137;
	indices[402] = 120;
	indices[403] = 121;
	indices[404] = 140;
	indices[405] = 122;
	indices[406] = 123;
	indices[407] = 137;
	indices[408] = 123;
	indices[409] = 124;
	indices[410] = 137;
	indices[411] = 104;
	indices[412] = 128;
	indices[413] = 141;
	indices[414] = 105;
	indices[415] = 104;
	indices[416] = 142;
	indices[417] = 105;
	indices[418] = 142;
	indices[419] = 132;
	indices[420] = 128;
	indices[421] = 109;
	indices[422] = 143;
	indices[423] = 109;
	indices[424] = 134;
	indices[425] = 143;
	indices[426] = 127;
	indices[427] = 107;
	indices[428] = 144;
	indices[429] = 107;
	indices[430] = 133;
	indices[431] = 144;
	indices[432] = 121;
	indices[433] = 122;
	indices[434] = 145;
	indices[435] = 140;
	indices[436] = 121;
	indices[437] = 145;
	indices[438] = 122;
	indices[439] = 137;
	indices[440] = 145;
	indices[441] = 114;
	indices[442] = 130;
	indices[443] = 146;
	indices[444] = 136;
	indices[445] = 114;
	indices[446] = 146;
	indices[447] = 130;
	indices[448] = 131;
	indices[449] = 146;
	indices[450] = 128;
	indices[451] = 143;
	indices[452] = 147;
	indices[453] = 135;
	indices[454] = 113;
	indices[455] = 136;
	indices[456] = 128;
	indices[457] = 147;
	indices[458] = 141;
	indices[459] = 139;
	indices[460] = 118;
	indices[461] = 138;
	indices[462] = 116;
	indices[463] = 117;
	indices[464] = 148;
	indices[465] = 129;
	indices[466] = 120;
	indices[467] = 149;
	indices[468] = 119;
	indices[469] = 129;
	indices[470] = 149;
	indices[471] = 120;
	indices[472] = 140;
	indices[473] = 149;
	indices[474] = 131;
	indices[475] = 116;
	indices[476] = 148;
	indices[477] = 117;
	indices[478] = 139;
	indices[479] = 148;
	indices[480] = 104;
	indices[481] = 141;
	indices[482] = 142;
	indices[483] = 137;
	indices[484] = 127;
	indices[485] = 145;
	indices[486] = 145;
	indices[487] = 127;
	indices[488] = 150;
	indices[489] = 140;
	indices[490] = 145;
	indices[491] = 150;
	indices[492] = 127;
	indices[493] = 144;
	indices[494] = 150;
	indices[495] = 135;
	indices[496] = 136;
	indices[497] = 143;
	indices[498] = 134;
	indices[499] = 110;
	indices[500] = 135;
	indices[501] = 142;
	indices[502] = 141;
	indices[503] = 148;
	indices[504] = 119;
	indices[505] = 149;
	indices[506] = 138;
	indices[507] = 131;
	indices[508] = 148;
	indices[509] = 141;
	indices[510] = 148;
	indices[511] = 139;
	indices[512] = 142;
	indices[513] = 135;
	indices[514] = 143;
	indices[515] = 134;
	indices[516] = 138;
	indices[517] = 149;
	indices[518] = 140;
	indices[519] = 138;
	indices[520] = 140;
	indices[521] = 150;
	indices[522] = 143;
	indices[523] = 136;
	indices[524] = 147;
	indices[525] = 131;
	indices[526] = 141;
	indices[527] = 146;
	indices[528] = 141;
	indices[529] = 147;
	indices[530] = 146;
	indices[531] = 146;
	indices[532] = 147;
	indices[533] = 136;
	indices[534] = 139;
	indices[535] = 138;
	indices[536] = 144;
	indices[537] = 133;
	indices[538] = 132;
	indices[539] = 139;
	indices[540] = 144;
	indices[541] = 133;
	indices[542] = 139;
	indices[543] = 144;
	indices[544] = 138;
	indices[545] = 150;
	indices[546] = 142;
	indices[547] = 139;
	indices[548] = 132;
	indices[549] = 59;
	indices[550] = 12;
	indices[551] = 151;
	indices[552] = 60;
	indices[553] = 59;
	indices[554] = 152;
	indices[555] = 59;
	indices[556] = 151;
	indices[557] = 152;
	indices[558] = 0;
	indices[559] = 60;
	indices[560] = 19;
	indices[561] = 61;
	indices[562] = 13;
	indices[563] = 153;
	indices[564] = 62;
	indices[565] = 61;
	indices[566] = 154;
	indices[567] = 61;
	indices[568] = 153;
	indices[569] = 154;
	indices[570] = 12;
	indices[571] = 62;
	indices[572] = 155;
	indices[573] = 63;
	indices[574] = 4;
	indices[575] = 37;
	indices[576] = 64;
	indices[577] = 63;
	indices[578] = 156;
	indices[579] = 13;
	indices[580] = 64;
	indices[581] = 157;
	indices[582] = 64;
	indices[583] = 156;
	indices[584] = 157;
	indices[585] = 35;
	indices[586] = 7;
	indices[587] = 68;
	indices[588] = 36;
	indices[589] = 35;
	indices[590] = 158;
	indices[591] = 35;
	indices[592] = 68;
	indices[593] = 158;
	indices[594] = 65;
	indices[595] = 14;
	indices[596] = 74;
	indices[597] = 66;
	indices[598] = 65;
	indices[599] = 159;
	indices[600] = 67;
	indices[601] = 66;
	indices[602] = 160;
	indices[603] = 66;
	indices[604] = 159;
	indices[605] = 160;
	indices[606] = 68;
	indices[607] = 67;
	indices[608] = 161;
	indices[609] = 158;
	indices[610] = 68;
	indices[611] = 161;
	indices[612] = 67;
	indices[613] = 160;
	indices[614] = 161;
	indices[615] = 69;
	indices[616] = 15;
	indices[617] = 78;
	indices[618] = 70;
	indices[619] = 69;
	indices[620] = 162;
	indices[621] = 71;
	indices[622] = 70;
	indices[623] = 163;
	indices[624] = 70;
	indices[625] = 162;
	indices[626] = 163;
	indices[627] = 72;
	indices[628] = 71;
	indices[629] = 164;
	indices[630] = 71;
	indices[631] = 163;
	indices[632] = 164;
	indices[633] = 73;
	indices[634] = 72;
	indices[635] = 165;
	indices[636] = 72;
	indices[637] = 164;
	indices[638] = 165;
	indices[639] = 76;
	indices[640] = 75;
	indices[641] = 166;
	indices[642] = 77;
	indices[643] = 76;
	indices[644] = 167;
	indices[645] = 76;
	indices[646] = 166;
	indices[647] = 167;
	indices[648] = 78;
	indices[649] = 77;
	indices[650] = 168;
	indices[651] = 77;
	indices[652] = 167;
	indices[653] = 168;
	indices[654] = 20;
	indices[655] = 19;
	indices[656] = 169;
	indices[657] = 21;
	indices[658] = 20;
	indices[659] = 170;
	indices[660] = 20;
	indices[661] = 169;
	indices[662] = 170;
	indices[663] = 19;
	indices[664] = 60;
	indices[665] = 152;
	indices[666] = 63;
	indices[667] = 37;
	indices[668] = 156;
	indices[669] = 65;
	indices[670] = 74;
	indices[671] = 159;
	indices[672] = 153;
	indices[673] = 13;
	indices[674] = 171;
	indices[675] = 62;
	indices[676] = 154;
	indices[677] = 155;
	indices[678] = 159;
	indices[679] = 74;
	indices[680] = 73;
	indices[681] = 13;
	indices[682] = 157;
	indices[683] = 171;
	indices[684] = 37;
	indices[685] = 36;
	indices[686] = 172;
	indices[687] = 69;
	indices[688] = 78;
	indices[689] = 162;
	indices[690] = 36;
	indices[691] = 158;
	indices[692] = 172;
	indices[693] = 73;
	indices[694] = 165;
	indices[695] = 159;
	indices[696] = 75;
	indices[697] = 2;
	indices[698] = 173;
	indices[699] = 19;
	indices[700] = 152;
	indices[701] = 169;
	indices[702] = 12;
	indices[703] = 155;
	indices[704] = 174;
	indices[705] = 21;
	indices[706] = 170;
	indices[707] = 173;
	indices[708] = 2;
	indices[709] = 21;
	indices[710] = 173;
	indices[711] = 151;
	indices[712] = 12;
	indices[713] = 175;
	indices[714] = 12;
	indices[715] = 174;
	indices[716] = 175;
	indices[717] = 75;
	indices[718] = 173;
	indices[719] = 166;
	indices[720] = 37;
	indices[721] = 172;
	indices[722] = 156;
	indices[723] = 154;
	indices[724] = 153;
	indices[725] = 176;
	indices[726] = 155;
	indices[727] = 154;
	indices[728] = 177;
	indices[729] = 159;
	indices[730] = 165;
	indices[731] = 178;
	indices[732] = 163;
	indices[733] = 162;
	indices[734] = 179;
	indices[735] = 160;
	indices[736] = 159;
	indices[737] = 178;
	indices[738] = 153;
	indices[739] = 171;
	indices[740] = 180;
	indices[741] = 153;
	indices[742] = 180;
	indices[743] = 176;
	indices[744] = 167;
	indices[745] = 166;
	indices[746] = 181;
	indices[747] = 172;
	indices[748] = 158;
	indices[749] = 182;
	indices[750] = 156;
	indices[751] = 172;
	indices[752] = 182;
	indices[753] = 158;
	indices[754] = 161;
	indices[755] = 182;
	indices[756] = 165;
	indices[757] = 164;
	indices[758] = 180;
	indices[759] = 169;
	indices[760] = 152;
	indices[761] = 183;
	indices[762] = 152;
	indices[763] = 151;
	indices[764] = 183;
	indices[765] = 174;
	indices[766] = 155;
	indices[767] = 184;
	indices[768] = 155;
	indices[769] = 177;
	indices[770] = 184;
	indices[771] = 168;
	indices[772] = 167;
	indices[773] = 185;
	indices[774] = 157;
	indices[775] = 156;
	indices[776] = 182;
	indices[777] = 154;
	indices[778] = 176;
	indices[779] = 177;
	indices[780] = 163;
	indices[781] = 179;
	indices[782] = 186;
	indices[783] = 170;
	indices[784] = 169;
	indices[785] = 183;
	indices[786] = 167;
	indices[787] = 181;
	indices[788] = 185;
	indices[789] = 162;
	indices[790] = 78;
	indices[791] = 168;
	indices[792] = 180;
	indices[793] = 171;
	indices[794] = 178;
	indices[795] = 183;
	indices[796] = 151;
	indices[797] = 175;
	indices[798] = 164;
	indices[799] = 163;
	indices[800] = 186;
	indices[801] = 180;
	indices[802] = 164;
	indices[803] = 176;
	indices[804] = 171;
	indices[805] = 157;
	indices[806] = 187;
	indices[807] = 165;
	indices[808] = 180;
	indices[809] = 178;
	indices[810] = 171;
	indices[811] = 187;
	indices[812] = 178;
	indices[813] = 187;
	indices[814] = 157;
	indices[815] = 182;
	indices[816] = 162;
	indices[817] = 168;
	indices[818] = 185;
	indices[819] = 162;
	indices[820] = 185;
	indices[821] = 179;
	indices[822] = 166;
	indices[823] = 173;
	indices[824] = 188;
	indices[825] = 175;
	indices[826] = 174;
	indices[827] = 189;
	indices[828] = 166;
	indices[829] = 188;
	indices[830] = 181;
	indices[831] = 174;
	indices[832] = 184;
	indices[833] = 189;
	indices[834] = 186;
	indices[835] = 179;
	indices[836] = 184;
	indices[837] = 179;
	indices[838] = 185;
	indices[839] = 189;
	indices[840] = 176;
	indices[841] = 164;
	indices[842] = 186;
	indices[843] = 160;
	indices[844] = 178;
	indices[845] = 187;
	indices[846] = 187;
	indices[847] = 182;
	indices[848] = 161;
	indices[849] = 189;
	indices[850] = 184;
	indices[851] = 179;
	indices[852] = 161;
	indices[853] = 160;
	indices[854] = 187;
	indices[855] = 173;
	indices[856] = 170;
	indices[857] = 188;
	indices[858] = 185;
	indices[859] = 181;
	indices[860] = 189;
	indices[861] = 189;
	indices[862] = 181;
	indices[863] = 175;
	indices[864] = 175;
	indices[865] = 181;
	indices[866] = 183;
	indices[867] = 176;
	indices[868] = 186;
	indices[869] = 177;
	indices[870] = 170;
	indices[871] = 183;
	indices[872] = 188;
	indices[873] = 177;
	indices[874] = 186;
	indices[875] = 184;
	indices[876] = 188;
	indices[877] = 183;
	indices[878] = 181;
	indices[879] = 2;
	indices[880] = 75;
	indices[881] = 23;
	indices[882] = 75;
	indices[883] = 76;
	indices[884] = 190;
	indices[885] = 76;
	indices[886] = 77;
	indices[887] = 191;
	indices[888] = 76;
	indices[889] = 191;
	indices[890] = 190;
	indices[891] = 77;
	indices[892] = 78;
	indices[893] = 192;
	indices[894] = 77;
	indices[895] = 192;
	indices[896] = 191;
	indices[897] = 78;
	indices[898] = 15;
	indices[899] = 193;
	indices[900] = 192;
	indices[901] = 78;
	indices[902] = 193;
	indices[903] = 15;
	indices[904] = 80;
	indices[905] = 193;
	indices[906] = 79;
	indices[907] = 10;
	indices[908] = 46;
	indices[909] = 80;
	indices[910] = 79;
	indices[911] = 194;
	indices[912] = 79;
	indices[913] = 46;
	indices[914] = 194;
	indices[915] = 43;
	indices[916] = 3;
	indices[917] = 22;
	indices[918] = 44;
	indices[919] = 43;
	indices[920] = 195;
	indices[921] = 45;
	indices[922] = 44;
	indices[923] = 196;
	indices[924] = 44;
	indices[925] = 195;
	indices[926] = 196;
	indices[927] = 46;
	indices[928] = 45;
	indices[929] = 197;
	indices[930] = 194;
	indices[931] = 46;
	indices[932] = 197;
	indices[933] = 45;
	indices[934] = 196;
	indices[935] = 197;
	indices[936] = 22;
	indices[937] = 23;
	indices[938] = 198;
	indices[939] = 193;
	indices[940] = 80;
	indices[941] = 194;
	indices[942] = 43;
	indices[943] = 22;
	indices[944] = 198;
	indices[945] = 195;
	indices[946] = 43;
	indices[947] = 198;
	indices[948] = 23;
	indices[949] = 75;
	indices[950] = 198;
	indices[951] = 191;
	indices[952] = 192;
	indices[953] = 197;
	indices[954] = 190;
	indices[955] = 191;
	indices[956] = 196;
	indices[957] = 196;
	indices[958] = 195;
	indices[959] = 190;
	indices[960] = 196;
	indices[961] = 191;
	indices[962] = 197;
	indices[963] = 195;
	indices[964] = 198;
	indices[965] = 190;
	indices[966] = 198;
	indices[967] = 75;
	indices[968] = 190;
	indices[969] = 193;
	indices[970] = 194;
	indices[971] = 192;
	indices[972] = 192;
	indices[973] = 194;
	indices[974] = 197;
	indices[975] = 15;
	indices[976] = 69;
	indices[977] = 80;
	indices[978] = 69;
	indices[979] = 70;
	indices[980] = 199;
	indices[981] = 70;
	indices[982] = 71;
	indices[983] = 200;
	indices[984] = 70;
	indices[985] = 200;
	indices[986] = 199;
	indices[987] = 71;
	indices[988] = 72;
	indices[989] = 201;
	indices[990] = 71;
	indices[991] = 201;
	indices[992] = 200;
	indices[993] = 72;
	indices[994] = 73;
	indices[995] = 202;
	indices[996] = 72;
	indices[997] = 202;
	indices[998] = 201;
	indices[999] = 73;
	indices[1000] = 74;
	indices[1001] = 203;
	indices[1002] = 73;
	indices[1003] = 203;
	indices[1004] = 202;
	indices[1005] = 74;
	indices[1006] = 14;
	indices[1007] = 82;
	indices[1008] = 81;
	indices[1009] = 11;
	indices[1010] = 52;
	indices[1011] = 82;
	indices[1012] = 81;
	indices[1013] = 204;
	indices[1014] = 81;
	indices[1015] = 52;
	indices[1016] = 204;
	indices[1017] = 47;
	indices[1018] = 10;
	indices[1019] = 79;
	indices[1020] = 48;
	indices[1021] = 47;
	indices[1022] = 205;
	indices[1023] = 49;
	indices[1024] = 48;
	indices[1025] = 200;
	indices[1026] = 50;
	indices[1027] = 49;
	indices[1028] = 201;
	indices[1029] = 51;
	indices[1030] = 50;
	indices[1031] = 202;
	indices[1032] = 52;
	indices[1033] = 51;
	indices[1034] = 204;
	indices[1035] = 79;
	indices[1036] = 80;
	indices[1037] = 206;
	indices[1038] = 80;
	indices[1039] = 69;
	indices[1040] = 206;
	indices[1041] = 47;
	indices[1042] = 79;
	indices[1043] = 206;
	indices[1044] = 74;
	indices[1045] = 82;
	indices[1046] = 203;
	indices[1047] = 202;
	indices[1048] = 50;
	indices[1049] = 201;
	indices[1050] = 201;
	indices[1051] = 49;
	indices[1052] = 200;
	indices[1053] = 205;
	indices[1054] = 47;
	indices[1055] = 206;
	indices[1056] = 205;
	indices[1057] = 206;
	indices[1058] = 199;
	indices[1059] = 200;
	indices[1060] = 48;
	indices[1061] = 205;
	indices[1062] = 199;
	indices[1063] = 206;
	indices[1064] = 69;
	indices[1065] = 51;
	indices[1066] = 202;
	indices[1067] = 203;
	indices[1068] = 200;
	indices[1069] = 205;
	indices[1070] = 199;
	indices[1071] = 204;
	indices[1072] = 51;
	indices[1073] = 203;
	indices[1074] = 203;
	indices[1075] = 82;
	indices[1076] = 204;
	indices[1077] = 14;
	indices[1078] = 65;
	indices[1079] = 82;
	indices[1080] = 65;
	indices[1081] = 66;
	indices[1082] = 207;
	indices[1083] = 66;
	indices[1084] = 67;
	indices[1085] = 208;
	indices[1086] = 66;
	indices[1087] = 208;
	indices[1088] = 207;
	indices[1089] = 67;
	indices[1090] = 68;
	indices[1091] = 209;
	indices[1092] = 67;
	indices[1093] = 209;
	indices[1094] = 208;
	indices[1095] = 68;
	indices[1096] = 7;
	indices[1097] = 34;
	indices[1098] = 33;
	indices[1099] = 6;
	indices[1100] = 56;
	indices[1101] = 34;
	indices[1102] = 33;
	indices[1103] = 210;
	indices[1104] = 33;
	indices[1105] = 56;
	indices[1106] = 210;
	indices[1107] = 53;
	indices[1108] = 11;
	indices[1109] = 81;
	indices[1110] = 54;
	indices[1111] = 53;
	indices[1112] = 211;
	indices[1113] = 55;
	indices[1114] = 54;
	indices[1115] = 212;
	indices[1116] = 56;
	indices[1117] = 55;
	indices[1118] = 213;
	indices[1119] = 210;
	indices[1120] = 56;
	indices[1121] = 213;
	indices[1122] = 55;
	indices[1123] = 212;
	indices[1124] = 213;
	indices[1125] = 81;
	indices[1126] = 82;
	indices[1127] = 214;
	indices[1128] = 82;
	indices[1129] = 65;
	indices[1130] = 214;
	indices[1131] = 53;
	indices[1132] = 81;
	indices[1133] = 214;
	indices[1134] = 53;
	indices[1135] = 214;
	indices[1136] = 211;
	indices[1137] = 212;
	indices[1138] = 54;
	indices[1139] = 211;
	indices[1140] = 68;
	indices[1141] = 34;
	indices[1142] = 209;
	indices[1143] = 212;
	indices[1144] = 211;
	indices[1145] = 208;
	indices[1146] = 211;
	indices[1147] = 214;
	indices[1148] = 207;
	indices[1149] = 214;
	indices[1150] = 65;
	indices[1151] = 207;
	indices[1152] = 208;
	indices[1153] = 211;
	indices[1154] = 207;
	indices[1155] = 212;
	indices[1156] = 208;
	indices[1157] = 213;
	indices[1158] = 208;
	indices[1159] = 209;
	indices[1160] = 213;
	indices[1161] = 34;
	indices[1162] = 210;
	indices[1163] = 209;
	indices[1164] = 209;
	indices[1165] = 210;
	indices[1166] = 213;
	indices[1167] = 83;
	indices[1168] = 13;
	indices[1169] = 61;
	indices[1170] = 84;
	indices[1171] = 83;
	indices[1172] = 215;
	indices[1173] = 85;
	indices[1174] = 84;
	indices[1175] = 216;
	indices[1176] = 84;
	indices[1177] = 215;
	indices[1178] = 216;
	indices[1179] = 9;
	indices[1180] = 85;
	indices[1181] = 40;
	indices[1182] = 40;
	indices[1183] = 85;
	indices[1184] = 216;
	indices[1185] = 61;
	indices[1186] = 62;
	indices[1187] = 217;
	indices[1188] = 62;
	indices[1189] = 12;
	indices[1190] = 218;
	indices[1191] = 217;
	indices[1192] = 62;
	indices[1193] = 218;
	indices[1194] = 12;
	indices[1195] = 86;
	indices[1196] = 218;
	indices[1197] = 86;
	indices[1198] = 87;
	indices[1199] = 219;
	indices[1200] = 86;
	indices[1201] = 219;
	indices[1202] = 218;
	indices[1203] = 88;
	indices[1204] = 8;
	indices[1205] = 38;
	indices[1206] = 38;
	indices[1207] = 39;
	indices[1208] = 220;
	indices[1209] = 39;
	indices[1210] = 40;
	indices[1211] = 216;
	indices[1212] = 83;
	indices[1213] = 61;
	indices[1214] = 217;
	indices[1215] = 88;
	indices[1216] = 38;
	indices[1217] = 220;
	indices[1218] = 88;
	indices[1219] = 220;
	indices[1220] = 87;
	indices[1221] = 220;
	indices[1222] = 39;
	indices[1223] = 216;
	indices[1224] = 215;
	indices[1225] = 83;
	indices[1226] = 217;
	indices[1227] = 217;
	indices[1228] = 218;
	indices[1229] = 221;
	indices[1230] = 215;
	indices[1231] = 217;
	indices[1232] = 221;
	indices[1233] = 218;
	indices[1234] = 219;
	indices[1235] = 221;
	indices[1236] = 216;
	indices[1237] = 215;
	indices[1238] = 221;
	indices[1239] = 219;
	indices[1240] = 87;
	indices[1241] = 220;
	indices[1242] = 220;
	indices[1243] = 216;
	indices[1244] = 221;
	indices[1245] = 219;
	indices[1246] = 220;
	indices[1247] = 221;
	indices[1248] = 86;
	indices[1249] = 12;
	indices[1250] = 59;
	indices[1251] = 87;
	indices[1252] = 86;
	indices[1253] = 222;
	indices[1254] = 88;
	indices[1255] = 87;
	indices[1256] = 223;
	indices[1257] = 87;
	indices[1258] = 222;
	indices[1259] = 223;
	indices[1260] = 8;
	indices[1261] = 88;
	indices[1262] = 42;
	indices[1263] = 42;
	indices[1264] = 88;
	indices[1265] = 223;
	indices[1266] = 60;
	indices[1267] = 0;
	indices[1268] = 16;
	indices[1269] = 16;
	indices[1270] = 17;
	indices[1271] = 222;
	indices[1272] = 17;
	indices[1273] = 18;
	indices[1274] = 223;
	indices[1275] = 18;
	indices[1276] = 1;
	indices[1277] = 41;
	indices[1278] = 86;
	indices[1279] = 59;
	indices[1280] = 222;
	indices[1281] = 60;
	indices[1282] = 16;
	indices[1283] = 222;
	indices[1284] = 59;
	indices[1285] = 60;
	indices[1286] = 222;
	indices[1287] = 222;
	indices[1288] = 17;
	indices[1289] = 223;
	indices[1290] = 18;
	indices[1291] = 41;
	indices[1292] = 223;
	indices[1293] = 41;
	indices[1294] = 42;
	indices[1295] = 223;
	indices[1296] = 27;
	indices[1297] = 4;
	indices[1298] = 63;
	indices[1299] = 28;
	indices[1300] = 27;
	indices[1301] = 224;
	indices[1302] = 29;
	indices[1303] = 28;
	indices[1304] = 225;
	indices[1305] = 28;
	indices[1306] = 224;
	indices[1307] = 225;
	indices[1308] = 5;
	indices[1309] = 29;
	indices[1310] = 226;
	indices[1311] = 58;
	indices[1312] = 5;
	indices[1313] = 226;
	indices[1314] = 29;
	indices[1315] = 225;
	indices[1316] = 226;
	indices[1317] = 63;
	indices[1318] = 64;
	indices[1319] = 227;
	indices[1320] = 64;
	indices[1321] = 13;
	indices[1322] = 83;
	indices[1323] = 84;
	indices[1324] = 85;
	indices[1325] = 225;
	indices[1326] = 85;
	indices[1327] = 9;
	indices[1328] = 57;
	indices[1329] = 57;
	indices[1330] = 58;
	indices[1331] = 226;
	indices[1332] = 64;
	indices[1333] = 83;
	indices[1334] = 227;
	indices[1335] = 224;
	indices[1336] = 27;
	indices[1337] = 227;
	indices[1338] = 63;
	indices[1339] = 227;
	indices[1340] = 27;
	indices[1341] = 84;
	indices[1342] = 225;
	indices[1343] = 224;
	indices[1344] = 83;
	indices[1345] = 84;
	indices[1346] = 224;
	indices[1347] = 85;
	indices[1348] = 57;
	indices[1349] = 226;
	indices[1350] = 225;
	indices[1351] = 85;
	indices[1352] = 226;
	indices[1353] = 227;
	indices[1354] = 83;
	indices[1355] = 224;

	// create frame drawer
	frame_drawer = new FrameDrawer(show_nodes_checkbox, coord, color, indices, canvas_size, gl);

	// set events handlers
	document.onkeydown = function (key_event) { frame_drawer.keyDown(key_event) };
	document.onkeyup = function (key_event) { frame_drawer.keyUp(key_event) };
	// canvas.onmousedown = function (mouse_event) { frame_drawer.mouseDown(mouse_event) };
	// canvas.onmouseup = function (mouse_event) { frame_drawer.mouseUp(mouse_event) };
	// canvas.onmousemove = function (mouse_event) { frame_drawer.mouseMoved(mouse_event) };
}