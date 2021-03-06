#include "Exporter.h"

Exporter::Exporter(const DataLoader* data_loader, const Solver* solver) : m_data_loader(data_loader), m_solver(solver), m_exe_file_path("") {
}

void Exporter::setExeFilePath(const string& file_path) {
	m_exe_file_path = file_path;
	unsigned int  index = m_exe_file_path.find_last_of('\\');
	m_exe_file_path = m_exe_file_path.substr(0, index);

	index = m_exe_file_path.find("\\");
	while (index != -1) {
		m_exe_file_path.at(index) = '/';
		index = m_exe_file_path.find("\\");
	}
}

void Exporter::generateJSFile(const string& file_path) const {
	unsigned int  number_of_nodes = m_data_loader->getNodeCount();
	unsigned int  max_coord = m_data_loader->getMaxCoord();
	double max_temperature = m_solver->getMaxTemperature();
	double min_temperature = m_solver->getMinTemperature();
	double temperature_delta = max_temperature - min_temperature;
	double current_node_temperature;
	double color_coeff;
	double red_coeff, green_coeff, blue_coeff;
	const array<double, COORDS_PER_NODE>* current_node_coord;
	const array <double, COORDS_PER_NODE>* object_center = m_data_loader->getObjectCenter();
	vector <unsigned int > boundary_nodes;
	ofstream js_file;
	ifstream js_template_1;
	ifstream js_template_2;

	cout << "Exporting data to html file..." << endl << endl;

	js_template_1.open(m_exe_file_path + "/webgl sources/1.txt", ios::in);
	js_template_2.open(m_exe_file_path + "/webgl sources/2.txt", ios::in);
	js_file.open(m_exe_file_path + file_path, ios::out);

	js_file << js_template_1.rdbuf();

	js_file << endl;
	js_file << "	let number_of_nodes = " << number_of_nodes << ";" << endl;
	js_file << "	let coord = new Float32Array(number_of_nodes * COORDS_PER_NODE);" << endl;
	js_file << "	let color = new Float32Array(number_of_nodes * COLOR_COMPONENTS);" << endl << endl;

	for (unsigned int i = 0; i < number_of_nodes; ++i) {
		current_node_coord = m_data_loader->getNodeCoord(i);
		current_node_temperature = m_solver->getTemperatureAtNode(i);
		color_coeff = (current_node_temperature - min_temperature) / temperature_delta;

		red_coeff = 0;
		blue_coeff = 0;
		green_coeff = 0;

		if (color_coeff >= 0 && color_coeff <= 0.25) {
			red_coeff = 0;
			green_coeff = 4 * color_coeff;
			blue_coeff = 1;
		}
		if (color_coeff > 0.25 && color_coeff <= 0.5) {
			red_coeff = 0;
			green_coeff = 1;
			blue_coeff = 2 - 4 * color_coeff;
		}
		if (color_coeff > 0.5 && color_coeff <= 0.75) {
			red_coeff = 4 * color_coeff - 2;
			green_coeff = 1;
			blue_coeff = 0;
		}
		if (color_coeff > 0.75 && color_coeff <= 1) {
			red_coeff = 1;
			green_coeff = 4 - 4 * color_coeff;
			blue_coeff = 0;
		}

		js_file << "	coord[" << i * 3 << "] = " << (current_node_coord->at(0) - object_center->at(0)) / max_coord << ";" << endl;
		js_file << "	coord[" << i * 3 + 1 << "] = " << (current_node_coord->at(1) - object_center->at(1)) / max_coord << ";" << endl;
		js_file << "	coord[" << i * 3 + 2 << "] = " << (current_node_coord->at(2) - object_center->at(2)) / max_coord << ";" << endl;
		js_file << "	color[" << i * 3 << "] = " << red_coeff << ";" << endl;
		js_file << "	color[" << i * 3 + 1 << "] = " << green_coeff << ";" << endl;
		js_file << "	color[" << i * 3 + 2 << "] = " << blue_coeff << ";" << endl;
		js_file << endl;
	}

	boundary_nodes = m_data_loader->getBoundaryNodes();
	js_file << "	let indices = new Uint16Array(" << boundary_nodes.size() << ");" << endl << endl;

	for (unsigned int i = 0; i < boundary_nodes.size(); ++i)
		js_file << "	indices[" << i << "] = " << boundary_nodes.at(i) << ";" << endl;

	js_file << endl;

	js_file << js_template_2.rdbuf();

	js_template_1.close();
	js_template_2.close();
	js_file.close();

	cout << "Data exported" << endl << endl;
}

void Exporter::genetateTxtFile(const string& file_path) const {
	unsigned int  number_of_nodes = m_data_loader->getNodeCount();
	double current_node_temperature;
	double max_temperature = m_solver->getMaxTemperature();
	double min_temperature = m_solver->getMinTemperature();
	ofstream txt_file;

	cout << "Exporting data to txt file..." << endl << endl;

	txt_file.open(m_exe_file_path + file_path, ios::out);

	txt_file << max_temperature << endl;
	txt_file << min_temperature << endl;

	for (unsigned int i = 0; i < number_of_nodes; ++i) {
		current_node_temperature = m_solver->getTemperatureAtNode(i);
		txt_file << i << "	" << current_node_temperature;
		txt_file << endl;
	}

	txt_file.close();

	cout << "Data exported" << endl << endl;
}
