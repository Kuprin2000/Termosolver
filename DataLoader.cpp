#include "DataLoader.h"

void DataLoader::initHeatConduction() {
	cout << "Input heat conduction coefficient of the material: ";
	cin >> m_heat_conduction_coeff;
	system("cls");
}

void DataLoader::initCoords() {
	int number_of_nodes;
	double coord_value;
	string buffer_string;
	array<double, COORDS_PER_NODE> current_coords;

	m_file >> buffer_string;
	number_of_nodes = atoi(buffer_string.c_str());

	for (int i = 0; i < number_of_nodes; ++i) {
		m_file >> buffer_string;
		coord_value = atof(buffer_string.c_str());
		current_coords.at(0) = coord_value;
		if (m_max_coord < fabs(coord_value))
			m_max_coord = fabs(coord_value);

		m_file >> buffer_string;
		coord_value = atof(buffer_string.c_str());
		current_coords.at(1) = coord_value;
		if (m_max_coord < fabs(coord_value))
			m_max_coord = fabs(coord_value);

		m_file >> buffer_string;
		coord_value = atof(buffer_string.c_str());
		current_coords.at(2) = coord_value;
		if (m_max_coord < fabs(coord_value))
			m_max_coord = fabs(coord_value);

		m_coords.push_back(current_coords);
	}
}

void DataLoader::initElements() {
	int number_of_elements;
	string buffer_string;
	array<int, NODES_PER_ELEMENT>  indices;

	m_file >> buffer_string;
	number_of_elements = atoi(buffer_string.c_str());

	for (int i = 0; i < number_of_elements; ++i) {
		m_file >> buffer_string;
		m_file >> buffer_string;
		indices.at(0) = atoi(buffer_string.c_str()) - 1;
		m_file >> buffer_string;
		indices.at(1) = atoi(buffer_string.c_str()) - 1;
		m_file >> buffer_string;
		indices.at(2) = atoi(buffer_string.c_str()) - 1;
		m_file >> buffer_string;
		indices.at(3) = atoi(buffer_string.c_str()) - 1;

		m_elements.push_back(FiniteElement(i, &indices, &m_coords));
	}
}

void DataLoader::initEdges() {
	int number_of_edges, surface_id;
	int number_of_surfaces = 0;
	long key;
	string buffer_string;
	array<int, NODES_PER_EDGE>  indices;
	pair<long, int> new_hash_table_elem;

	m_node_examples = new map<int, array<int, NODES_PER_EDGE>>();

	m_file >> buffer_string;
	number_of_edges = atoi(buffer_string.c_str());

	for (int i = 0; i < number_of_edges; ++i) {
		m_file >> buffer_string;
		surface_id = atoi(buffer_string.c_str()) - 1;

		if (surface_id > number_of_surfaces)
			number_of_surfaces = surface_id;

		m_file >> buffer_string;
		indices.at(0) = atoi(buffer_string.c_str()) - 1;
		m_file >> buffer_string;
		indices.at(1) = atoi(buffer_string.c_str()) - 1;
		m_file >> buffer_string;
		indices.at(2) = atoi(buffer_string.c_str()) - 1;

		m_boundary_edges.push_back(Edge(surface_id, &indices, &m_coords));

		key = generateKey(&indices);

		new_hash_table_elem.first = key;
		new_hash_table_elem.second = i;
		m_boundary_edges_hash_table.insert(new_hash_table_elem);

		if (m_node_examples->count(surface_id) == 0)
			(*m_node_examples)[surface_id] = indices;
	}
}

bool DataLoader::initSufaces() {
	int current_node_id, condition_type, number_of_surfaces;
	double temperature, heat_flow, exchange_coeff;
	array<int, NODES_PER_EDGE> nodes_id;
	array<double, COORDS_PER_NODE> node_coord;
	Condition* condition = nullptr;

	number_of_surfaces = m_node_examples->size();

	m_surfaces.resize(number_of_surfaces);

	for (int i = 0; i < number_of_surfaces; ++i) {
		system("cls");
		cout << "Input conditions at surface " << i + 1 << endl << "Three nodes that belong to this surface:" << endl << endl;
		nodes_id = m_node_examples->at(i);
		for (int j = 0; j < NODES_PER_EDGE; ++j) {
			current_node_id = nodes_id.at(j);
			node_coord = m_coords.at(current_node_id);
			cout << nodes_id.at(j) << " : " << node_coord.at(0) << ", " << node_coord.at(1) << ", " << node_coord.at(2) << ";" << endl;
		}

		cout << endl << "Input type of the condition:" << endl << "1 = constant temperature" << endl << "2 = no heat exchange"
			<< endl << "3 = heat flow" << endl << "4 = environment heat exchange" << endl << endl;
		cin >> condition_type;

		switch (condition_type)
		{
		case 1: {
			cout << endl << "Input the temperature: ";
			cin >> temperature;
			condition = static_cast<Condition*>(new ConstantTempCondition(temperature));
			Surface surface(i, condition);
			m_surfaces.at(i) = surface;
		}
			  break;

		case 2: {
			condition = static_cast<Condition*>(new NoHeatExchangeCondition());
			Surface surface(i, condition);
			m_surfaces.at(i) = surface;
		}
			  break;

		case 3: {
			cout << endl << "Input the flow value: ";
			cin >> heat_flow;
			condition = static_cast<Condition*>(new HeatFlowCondition(heat_flow));
			Surface surface(i, condition);
			m_surfaces.at(i) = surface;
		}
			  break;

		case 4: {
			cout << endl << "Input the environment temperature: ";
			cin >> temperature;
			cout << endl << "Input the heat exchange coefficient: ";
			cin >> exchange_coeff;
			condition = static_cast<Condition*>(new EnvironmentHeatExchangeCondition(temperature, exchange_coeff));
			Surface surface(i, condition);
			m_surfaces.at(i) = surface;
		}
			  break;

		default:
			return false;
		}
	}

	system("cls");
	delete m_node_examples;

	return true;
}

long DataLoader::generateKey(array<int, NODES_PER_EDGE>* indices) {
	sort(indices->begin(), indices->end());
	return (indices->at(0) * indices->at(0) + indices->at(1) * indices->at(1) + indices->at(2) * indices->at(2)) % LONG_MAX;
}

DataLoader::DataLoader(const string& file_path) : m_max_coord(0), m_heat_conduction_coeff(DBL_MIN), m_node_examples(nullptr) {
	m_file.open(file_path);
}

DataLoader::~DataLoader() {
	for (int i = 0; i < m_surfaces.size(); ++i)
		m_surfaces.at(i).deleteCondition();
}

bool DataLoader::loadData()
{
	if (!m_file.is_open()) {
		cout << "Can't open the file!" << endl;
		return false;
	}

	cout << "Loading nodes... " << endl << endl;
	initCoords();
	cout << "Loading elements... " << endl << endl;
	initElements();
	cout << "Loading boundary edges... " << endl << endl;
	initEdges();
	system("cls");

	m_file.close();

	initHeatConduction();

	if (!initSufaces()) {
		cout << "Incorrect condition type!" << endl;
		return false;
	}

	cout << "Data loaded: " << getNodeCount() << " nodes, " << getElementCount()
		<< " elements and " << getSurfaceCount() << " surfaces" << endl << endl;

	return true;
}

const FiniteElement* DataLoader::getElement(int id) const {
	return &(m_elements.at(id));
}

const array<double, COORDS_PER_NODE>* DataLoader::getNodeCoord(int id) const {
	return &(m_coords.at(id));
}

const Edge* DataLoader::getIfBoundary(array<int, COORDS_PER_NODE>* indices)  const {
	const long key = generateKey(indices);
	const array<int, NODES_PER_EDGE>* edge_nodes_ids;
	array<int, NODES_PER_EDGE>::const_iterator id_iter;
	multimap<long, int>::const_iterator hash_table_iter;
	const Edge* current_edge;
	int current_edge_id;

	if (m_boundary_edges_hash_table.count(key)) {
		hash_table_iter = m_boundary_edges_hash_table.find(key);

		for (; hash_table_iter->first == key; ++hash_table_iter) {
			current_edge_id = hash_table_iter->second;
			current_edge = &m_boundary_edges.at(current_edge_id);
			edge_nodes_ids = current_edge->getRightIdsOrder();

			id_iter = std::find(edge_nodes_ids->begin(), edge_nodes_ids->end(), indices->at(0));
			if (id_iter == edge_nodes_ids->end())
				continue;

			id_iter = std::find(edge_nodes_ids->begin(), edge_nodes_ids->end(), indices->at(1));
			if (id_iter == edge_nodes_ids->end())
				continue;

			id_iter = std::find(edge_nodes_ids->begin(), edge_nodes_ids->end(), indices->at(2));
			if (id_iter == edge_nodes_ids->end())
				continue;

			return current_edge;
		}

		return nullptr;
	}

	else
		return nullptr;
}

const Surface* DataLoader::getSurface(int id) const {
	return &(m_surfaces.at(id));
}

double DataLoader::getHeatConductionCoeff() const {
	return m_heat_conduction_coeff;
}

int DataLoader::getNodeCount() const {
	return m_coords.size();
}

int DataLoader::getElementCount() const {
	return m_elements.size();
}

int DataLoader::getSurfaceCount() const {
	return m_surfaces.size();
}

double DataLoader::getMaxCoord() const {
	return m_max_coord;
}

vector<int> DataLoader::getBoundaryNodes() const
{
	vector<int> result;
	const array<int, NODES_PER_EDGE>* current_edge_node_ids;

	for (int i = 0; i < m_boundary_edges.size(); ++i) {
		current_edge_node_ids = m_boundary_edges.at(i).getRightIdsOrder();
		result.push_back(current_edge_node_ids->at(0));
		result.push_back(current_edge_node_ids->at(1));
		result.push_back(current_edge_node_ids->at(2));
	}

	return result;
}