#include "Solver.h"

Solver::Solver(const DataLoader* data_loader) :
	m_data_loader(data_loader), m_number_of_nodes(data_loader->getNodeCount()), m_max_temperature(DBL_MIN), m_min_temperature(DBL_MAX) {
}

void Solver::initLocalVector(array<double, NODES_PER_ELEMENT>* local_vector) const {
	local_vector->fill(0.);
}

void Solver::applyConstantTempCond(const map<unsigned int, double>* nodes_with_const_temp) {
	double temperature, tmp_value;
	unsigned int  current_i, current_j;
	map<pair<unsigned int, unsigned int >, double>::const_iterator global_matrix_iter;
	map<unsigned int, double>::const_iterator find_i_iter, find_j_iter;
	map<unsigned int, double>::const_iterator tmp_iter;
	map<unsigned int, double>::const_iterator nodes_with_const_temp_end = nodes_with_const_temp->end();

	for (global_matrix_iter = m_global_matrix.begin(); global_matrix_iter != m_global_matrix.end(); ++global_matrix_iter) {
		current_i = global_matrix_iter->first.first;
		current_j = global_matrix_iter->first.second;

		find_i_iter = nodes_with_const_temp->find(current_i);
		find_j_iter = nodes_with_const_temp->find(current_j);

		if (find_i_iter != nodes_with_const_temp_end && current_j != current_i) {
			global_matrix_iter = m_global_matrix.erase(global_matrix_iter);
			global_matrix_iter--;
			continue;
		}

		if (find_j_iter != nodes_with_const_temp_end && current_i != current_j) {
			temperature = find_j_iter->second;
			tmp_value = global_matrix_iter->second;
			addToGlobalVector(current_i, -tmp_value * temperature);
			global_matrix_iter = m_global_matrix.erase(global_matrix_iter);
			global_matrix_iter--;
			continue;
		}

		if (find_i_iter != nodes_with_const_temp_end && current_i == current_j) {
			tmp_value = global_matrix_iter->second;
			temperature = find_i_iter->second;
			setToGlobalVector(current_i, tmp_value * temperature);
			continue;
		}
	}
}

bool Solver::setGlobalArrays() {
	unsigned int  number_of_elements = m_data_loader->getElementCount();
	double heat_conduction_coeff = m_data_loader->getHeatConductionCoeff();
	double temperature;
	unsigned int  current_surface_id;
	const Edge* current_edge;
	const FiniteElement* current_elem;
	const array<unsigned int, NODES_PER_ELEMENT>* current_elem_nodes_id;
	array<const Edge*, NODES_PER_ELEMENT> current_elem_boundary_edges;
	array<array<double, NODES_PER_ELEMENT>, NODES_PER_ELEMENT> local_matrix;
	array<double, NODES_PER_ELEMENT> local_vector;
	array<array<unsigned int, NODES_PER_EDGE>, EDGES_PER_ELEMENT> local_numeration;
	map<unsigned int, double> nodes_with_const_temp;
	const array<unsigned int, 3>* current_edge_nodes_ids;
	Condition* current_condition;
	ConditionType current_condition_type;
	const Surface* current_surface;

	setupLocalNumeration(&local_numeration);

	cout << "Calculating global marix and global vector..." << endl << endl;

	for (unsigned int i = 0; i < number_of_elements; ++i) {
		current_elem = m_data_loader->getElement(i);
		current_elem_nodes_id = current_elem->getNodesId();

		setupBoundaryEdges(&local_numeration, current_elem_nodes_id, &current_elem_boundary_edges);

		initLocalMatrix(&local_matrix, current_elem, heat_conduction_coeff);

		for (unsigned int j = 0; j < EDGES_PER_ELEMENT; ++j) {
			if (current_elem_boundary_edges.at(j) == nullptr)
				continue;

			current_edge = current_elem_boundary_edges.at(j);
			current_surface_id = current_edge->getSurfaceId();
			current_surface = m_data_loader->getSurface(current_surface_id);
			current_condition = current_surface->getCondition();
			current_condition_type = current_condition->getType();

			initLocalVector(&local_vector);

			switch (current_condition_type) {
			case CONSTANT_TEMPERATURE:
				temperature = static_cast<ConstantTempCondition*>(current_condition)->getTemperature();
				current_edge_nodes_ids = current_edge->getRightIdsOrder();
				nodes_with_const_temp[current_edge_nodes_ids->at(0)] = temperature;
				nodes_with_const_temp[current_edge_nodes_ids->at(1)] = temperature;
				nodes_with_const_temp[current_edge_nodes_ids->at(2)] = temperature;
				break;
			case NO_HEAT_EXCHANGE:
				break;
			case HEAT_FLOW:
				heatFlowCond(&local_vector, &local_numeration.at(j), current_elem, current_edge,
					static_cast<HeatFlowCondition*>(current_condition));
				break;
			case ENVIRONMENT_HEAT_EXCHANGE:
				envirinmentHeatExchangeCond(&local_matrix, &local_vector, &local_numeration.at(j), current_elem, current_edge,
					static_cast<EnvironmentHeatExchangeCondition*>(current_condition));
				break;
			default:
				cout << "Error while constructing global arrays. Unknown boundary condition type!" << endl;
				return false;
				break;
			}

			for (unsigned int k = 0; k < NODES_PER_ELEMENT; ++k)
				addToGlobalVector(current_elem_nodes_id->at(k), local_vector[k]);
		}

		for (unsigned int k = 0; k < NODES_PER_ELEMENT; ++k)
			for (unsigned int l = 0; l < NODES_PER_ELEMENT; ++l)
				addToGlobalMatrix(current_elem_nodes_id->at(k), current_elem_nodes_id->at(l), local_matrix.at(k).at(l));
	}

	if (nodes_with_const_temp.size() != 0) {
		cout << "Applying constant temperature conditions..." << endl << endl;
		applyConstantTempCond(&nodes_with_const_temp);
	}

	cout << "Global matrix and global vector are done. Global matrix consists of zeros at " <<
		100 - (double)m_global_matrix.size() / ((double)m_number_of_nodes * (double)m_number_of_nodes) * 100 << " persent" << endl << endl;

	return true;
}

bool Solver::solve() {
	map<pair<unsigned int, unsigned int >, double>::const_iterator matrix_iter;
	map<unsigned int, double>::const_iterator vector_iter;
	vector<Eigen::Triplet<double>> triplets;
	Eigen::SparseMatrix < double> A;
	Eigen::VectorXd b;
	Eigen::SimplicialLLT<Eigen::SparseMatrix<double> > solver;
	A.resize(m_number_of_nodes, m_number_of_nodes);
	b.resize(m_number_of_nodes);
	m_result.resize(m_number_of_nodes);

	cout << "Solving the system..." << endl << endl;

	for (matrix_iter = m_global_matrix.begin(); matrix_iter != m_global_matrix.end(); ++matrix_iter)
		triplets.push_back(Eigen::Triplet<double>(matrix_iter->first.first, matrix_iter->first.second, matrix_iter->second));

	m_global_matrix.clear();

	A.setFromTriplets(triplets.begin(), triplets.end());

	for (unsigned int i = 0; i < m_number_of_nodes; ++i) {
		if (m_global_vector.count(i))
			b(i) = m_global_vector.at(i);
		else
			b(i) = 0;
	}

	m_global_vector.clear();

	solver.compute(A);
	if (solver.info() != Eigen::Success) {
		cout << "Error while solving the system!" << endl << endl;
		return false;
	}

	m_result = solver.solve(b);
	if (solver.info() != Eigen::Success) {
		cout << "Error while solving the system!" << endl << endl;
		return false;
	}

	cout << "Task is solved!" << endl << endl;

	for (unsigned int i = 0; i < m_number_of_nodes; ++i) {
		if (m_result(i) > m_max_temperature)
			m_max_temperature = m_result(i);

		if (m_result(i) < m_min_temperature)
			m_min_temperature = m_result(i);
	}

	return true;
}

double Solver::getTemperatureAtNode(unsigned int  i) const
{
	if (i > m_number_of_nodes || i < 0)
		return DBL_MIN;

	else
		return m_result(i);
}

unsigned int  Solver::getNodeCount() const {
	return m_number_of_nodes;
}

double Solver::getMaxTemperature() const {
	return m_max_temperature;
}

double Solver::getMinTemperature() const {
	return m_min_temperature;
}

void Solver::printTemperature() const {
	for (unsigned int i = 0; i < m_number_of_nodes; ++i)
		cout << "Temperature at node number " << i << " is " << m_result(i) << endl;

	cout << endl;
}

void Solver::heatFlowCond(array<double, NODES_PER_ELEMENT>* local_vector, const array<unsigned int, NODES_PER_EDGE>* local_numeration,
	const FiniteElement* elem, const Edge* edge, const HeatFlowCondition* condition) const {

	const array<double, COORDS_PER_NODE>* edge_center = edge->getCenter();
	double edge_square = edge->getSquare();
	double heat_flow = condition->getFlow();
	unsigned int  current_node_local_id;
	double coeff;
	const array<double, NODES_PER_ELEMENT>* coeffs_a = elem->getCoeffsA();
	const array<double, NODES_PER_ELEMENT>* coeffs_b = elem->getCoeffsB();
	const array<double, NODES_PER_ELEMENT>* coeffs_c = elem->getCoeffsC();
	const array<double, NODES_PER_ELEMENT>* coeffs_d = elem->getCoeffsD();
	array<double, NODES_PER_ELEMENT> center_values;

	center_values.fill(0.);

	for (unsigned int i = 0; i < NODES_PER_EDGE; ++i) {
		current_node_local_id = local_numeration->at(i);
		center_values.at(current_node_local_id) = coeffs_a->at(current_node_local_id);
		center_values.at(current_node_local_id) += edge_center->at(0) * coeffs_b->at(current_node_local_id);
		center_values.at(current_node_local_id) += edge_center->at(1) * coeffs_c->at(current_node_local_id);
		center_values.at(current_node_local_id) += edge_center->at(2) * coeffs_d->at(current_node_local_id);
	}

	coeff = heat_flow * edge_square;

	for (unsigned int i = 0; i < NODES_PER_EDGE; ++i) {
		current_node_local_id = local_numeration->at(i);
		local_vector->at(current_node_local_id) -= center_values.at(current_node_local_id) * coeff;
	}
}

void Solver::envirinmentHeatExchangeCond(array<array<double, NODES_PER_ELEMENT>, NODES_PER_ELEMENT>* local_matrix,
	array<double, NODES_PER_ELEMENT>* local_vector,
	const array<unsigned int, NODES_PER_EDGE>* local_numeration,
	const FiniteElement* elem, const Edge* edge,
	const EnvironmentHeatExchangeCondition* condition) const {

	double edge_square = edge->getSquare();
	double exchange_coeff = condition->getEchangeCoeff();
	double invironment_temp = condition->getEnvironmentTemp();
	unsigned int  current_node_local_id_1, current_node_local_id_2;
	double coeff;
	const array<double, COORDS_PER_NODE>* edge_center = edge->getCenter();
	const array<double, COORDS_PER_NODE>* point_a = edge->getPointA();
	const array<double, COORDS_PER_NODE>* point_b = edge->getPointB();
	const array<double, COORDS_PER_NODE>* point_c = edge->getPointC();
	const array<double, NODES_PER_ELEMENT>* coeffs_a = elem->getCoeffsA();
	const array<double, NODES_PER_ELEMENT>* coeffs_b = elem->getCoeffsB();
	const array<double, NODES_PER_ELEMENT>* coeffs_c = elem->getCoeffsC();
	const array<double, NODES_PER_ELEMENT>* coeffs_d = elem->getCoeffsD();
	array<double, NODES_PER_ELEMENT> center_values;
	array<double, NODES_PER_ELEMENT> point_a_values;
	array<double, NODES_PER_ELEMENT> point_b_values;
	array<double, NODES_PER_ELEMENT> point_c_values;

	center_values.fill(0.);
	point_a_values.fill(0.);
	point_b_values.fill(0.);
	point_c_values.fill(0.);

	for (unsigned int i = 0; i < NODES_PER_EDGE; ++i) {
		current_node_local_id_1 = local_numeration->at(i);
		center_values.at(current_node_local_id_1) = coeffs_a->at(current_node_local_id_1);
		center_values.at(current_node_local_id_1) += edge_center->at(0) * coeffs_b->at(current_node_local_id_1);
		center_values.at(current_node_local_id_1) += edge_center->at(1) * coeffs_c->at(current_node_local_id_1);
		center_values.at(current_node_local_id_1) += edge_center->at(2) * coeffs_d->at(current_node_local_id_1);
	}

	coeff = exchange_coeff * invironment_temp * edge_square;

	for (unsigned int i = 0; i < NODES_PER_EDGE; ++i) {
		current_node_local_id_1 = local_numeration->at(i);
		local_vector->at(current_node_local_id_1) += center_values.at(current_node_local_id_1) * coeff;
	}

	for (unsigned int i = 0; i < NODES_PER_EDGE; ++i) {
		current_node_local_id_1 = local_numeration->at(i);

		point_a_values.at(current_node_local_id_1) = coeffs_a->at(current_node_local_id_1);
		point_a_values.at(current_node_local_id_1) += coeffs_b->at(current_node_local_id_1) * point_a->at(0);
		point_a_values.at(current_node_local_id_1) += coeffs_c->at(current_node_local_id_1) * point_a->at(1);
		point_a_values.at(current_node_local_id_1) += coeffs_d->at(current_node_local_id_1) * point_a->at(2);

		point_b_values.at(current_node_local_id_1) = coeffs_a->at(current_node_local_id_1);
		point_b_values.at(current_node_local_id_1) += coeffs_b->at(current_node_local_id_1) * point_b->at(0);
		point_b_values.at(current_node_local_id_1) += coeffs_c->at(current_node_local_id_1) * point_b->at(1);
		point_b_values.at(current_node_local_id_1) += coeffs_d->at(current_node_local_id_1) * point_b->at(2);

		point_c_values.at(current_node_local_id_1) = coeffs_a->at(current_node_local_id_1);
		point_c_values.at(current_node_local_id_1) += coeffs_b->at(current_node_local_id_1) * point_c->at(0);
		point_c_values.at(current_node_local_id_1) += coeffs_c->at(current_node_local_id_1) * point_c->at(1);
		point_c_values.at(current_node_local_id_1) += coeffs_d->at(current_node_local_id_1) * point_c->at(2);

		center_values.at(current_node_local_id_1) = point_a_values.at(current_node_local_id_1);
		center_values.at(current_node_local_id_1) += point_b_values.at(current_node_local_id_1);
		center_values.at(current_node_local_id_1) += point_c_values.at(current_node_local_id_1);
		center_values.at(current_node_local_id_1) /= NODES_PER_EDGE;
	}

	coeff = edge_square * exchange_coeff;

	for (unsigned int i = 0; i < NODES_PER_EDGE; ++i) {
		current_node_local_id_1 = local_numeration->at(i);

		for (unsigned int j = 0; j < NODES_PER_EDGE; ++j) {
			current_node_local_id_2 = local_numeration->at(j);

			local_matrix->at(current_node_local_id_1).at(current_node_local_id_2) +=
				center_values.at(current_node_local_id_1) * center_values.at(current_node_local_id_2) * coeff;
		}
	}
}

void Solver::setupLocalNumeration(array<array<unsigned int, NODES_PER_EDGE>, EDGES_PER_ELEMENT>* local_numeration) const {
	local_numeration->at(0) = { 0,1,2 };
	local_numeration->at(1) = { 1,2,3 };
	local_numeration->at(2) = { 0,1,3 };
	local_numeration->at(3) = { 0,2,3 };
}

void Solver::setToGlobalMatrix(unsigned int  i, unsigned int  j, double value) {
	if (value == 0)
		m_global_matrix.erase(pair<unsigned int, unsigned int >(i, j));

	else
		m_global_matrix[pair<unsigned int, unsigned int >(i, j)] = value;
}

void Solver::addToGlobalMatrix(unsigned int  i, unsigned int  j, double value) {
	if (value != 0)
		m_global_matrix[pair<unsigned int, unsigned int >(i, j)] += value;
}

double Solver::getFromGlobalMatrix(unsigned int  i, unsigned int  j) const {
	pair<unsigned int, unsigned int > pair(i, j);

	if (m_global_matrix.count(pair))
		return m_global_matrix.at(pair);

	return 0.;
}

void Solver::setToGlobalVector(unsigned int  i, double value) {
	if (value == 0)
		m_global_vector.erase(i);

	else
		m_global_vector[i] = value;
}

void Solver::addToGlobalVector(unsigned int  i, double value) {
	if (value != 0)
		m_global_vector[i] += value;
}

double Solver::getFromGlobalVector(unsigned int  i) const {
	if (m_global_vector.count(i))
		return m_global_vector.at(i);

	return 0.;
}

void Solver::setupBoundaryEdges(const array<array<unsigned int, NODES_PER_EDGE>, EDGES_PER_ELEMENT>* local_numeration,
	const array<unsigned int, NODES_PER_ELEMENT>* nodes_id,
	array<const Edge*, NODES_PER_ELEMENT>* boundary_edges) const {
	array < array< unsigned int, NODES_PER_EDGE >, EDGES_PER_ELEMENT > ids_of_edge_nodes;
	const Edge* edge;

	boundary_edges->fill(0);

	for (unsigned int i = 0; i < EDGES_PER_ELEMENT; ++i)
		for (unsigned int j = 0; j < NODES_PER_EDGE; ++j)
			ids_of_edge_nodes.at(i).at(j) = nodes_id->at((*local_numeration)[i][j]);

	for (unsigned int i = 0; i < ids_of_edge_nodes.size(); ++i) {
		edge = m_data_loader->getIfBoundary(&ids_of_edge_nodes.at(i));
		boundary_edges->at(i) = edge;
	}
}

void Solver::initLocalMatrix(array<array<double, NODES_PER_ELEMENT>, NODES_PER_ELEMENT>* matrix,
	const FiniteElement* elem, double heat_conduction_coeff) const {
	const array<double, NODES_PER_ELEMENT>* b_coeffs = elem->getCoeffsB();
	const array<double, NODES_PER_ELEMENT>* c_coeffs = elem->getCoeffsC();
	const array<double, NODES_PER_ELEMENT>* d_coeffs = elem->getCoeffsD();
	double volume = elem->getVolume();
	double coeff = heat_conduction_coeff * volume;

	for (unsigned int i = 0; i < NODES_PER_ELEMENT; ++i)
		matrix->at(i).fill(0.);

	for (unsigned int i = 0; i < NODES_PER_ELEMENT; ++i)
		for (unsigned int j = i; j < NODES_PER_ELEMENT; ++j) {
			matrix->at(i).at(j) = b_coeffs->at(i) * b_coeffs->at(j);
			matrix->at(i).at(j) += c_coeffs->at(i) * c_coeffs->at(j);
			matrix->at(i).at(j) += d_coeffs->at(i) * d_coeffs->at(j);
			matrix->at(i).at(j) *= coeff;
		}

	for (unsigned int i = 0; i < NODES_PER_ELEMENT; ++i)
		for (unsigned int j = 0; j < i; ++j)
			matrix->at(i).at(j) = matrix->at(j).at(i);
}