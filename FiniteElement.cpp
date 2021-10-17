#include "FiniteElement.h"

double FiniteElement::calcDeleterminantPtr(double* matrix[3][3]) const {
	return
		*matrix[0][0] * *matrix[1][1] * *matrix[2][2] + *matrix[0][1] * *matrix[1][2] * *matrix[2][0] +
		*matrix[0][2] * *matrix[1][0] * *matrix[2][1] - *matrix[0][2] * *matrix[1][1] * *matrix[2][0] -
		*matrix[0][1] * *matrix[1][0] * *matrix[2][2] - *matrix[0][0] * *matrix[1][2] * *matrix[2][1];
}

void FiniteElement::initCenter(const vector<array<double, COORDS_PER_NODE>>* coord_array) {
	double x_accumulator = 0;
	double y_accumulator = 0;
	double z_accumulator = 0;
	const array<double, COORDS_PER_NODE>* current_node;

	for (unsigned int i = 0; i < NODES_PER_ELEMENT; ++i) {
		current_node = &(coord_array->at(m_nodes_id.at(i)));
		x_accumulator += current_node->at(0);
		y_accumulator += current_node->at(1);
		z_accumulator += current_node->at(2);
	}

	m_center.at(0) = x_accumulator / NODES_PER_ELEMENT;
	m_center.at(1) = y_accumulator / NODES_PER_ELEMENT;
	m_center.at(2) = z_accumulator / NODES_PER_ELEMENT;
}

void FiniteElement::initVolume(const vector<array<double, COORDS_PER_NODE>>* coord_array) {
	double matrix[3][3];
	const array<double, COORDS_PER_NODE>* basic_node;
	const array<double, COORDS_PER_NODE>* current_node;

	basic_node = &(coord_array->at(m_nodes_id.at(3)));
	for (unsigned int j = 0; j < 3; ++j) {
		current_node = &(coord_array->at(m_nodes_id.at(j)));
		for (unsigned int i = 0; i < COORDS_PER_NODE; ++i)
			matrix[i][j] = current_node->at(i) - basic_node->at(i);
	}

	m_volume = calcDeterminant(matrix);
	m_volume /= 6.;
}

void FiniteElement::initShapeFunctions(const vector<array<double, COORDS_PER_NODE>>* coord_array) {
	double* matrix[3][3];
	double x_coord[NODES_PER_ELEMENT];
	double y_coord[NODES_PER_ELEMENT];
	double z_coord[NODES_PER_ELEMENT];
	double delta, delta_1, delta_2, delta_3, delta_4;
	double one = 1.;
	unsigned int  j, k, l, current_index;

	for (unsigned int i = 0; i < NODES_PER_ELEMENT; ++i) {
		current_index = m_nodes_id[i];
		x_coord[i] = coord_array->at(current_index).at(0);
		y_coord[i] = coord_array->at(current_index).at(1);
		z_coord[i] = coord_array->at(current_index).at(2);
	}

	for (unsigned int i = 0; i < NODES_PER_ELEMENT; ++i) {
		j = (i + 1) % NODES_PER_ELEMENT;
		k = (i + 2) % NODES_PER_ELEMENT;
		l = (i + 3) % NODES_PER_ELEMENT;

		delta = 0;

		matrix[0][0] = &x_coord[j];
		matrix[0][1] = &y_coord[j];
		matrix[0][2] = &z_coord[j];

		matrix[1][0] = &x_coord[k];
		matrix[1][1] = &y_coord[k];
		matrix[1][2] = &z_coord[k];

		matrix[2][0] = &x_coord[l];
		matrix[2][1] = &y_coord[l];
		matrix[2][2] = &z_coord[l];

		delta += calcDeleterminantPtr(matrix);

		matrix[0][0] = &x_coord[i];
		matrix[0][1] = &y_coord[i];
		matrix[0][2] = &z_coord[i];

		delta -= calcDeleterminantPtr(matrix);

		matrix[1][0] = &x_coord[j];
		matrix[1][1] = &y_coord[j];
		matrix[1][2] = &z_coord[j];

		delta += calcDeleterminantPtr(matrix);

		matrix[2][0] = &x_coord[k];
		matrix[2][1] = &y_coord[k];
		matrix[2][2] = &z_coord[k];

		delta -= calcDeleterminantPtr(matrix);

		matrix[0][0] = &x_coord[j];
		matrix[0][1] = &y_coord[j];
		matrix[0][2] = &z_coord[j];

		matrix[1][0] = &x_coord[k];
		matrix[1][1] = &y_coord[k];
		matrix[1][2] = &z_coord[k];

		matrix[2][0] = &x_coord[l];
		matrix[2][1] = &y_coord[l];
		matrix[2][2] = &z_coord[l];

		delta_1 = calcDeleterminantPtr(matrix);

		matrix[0][0] = &one;
		matrix[1][0] = &one;
		matrix[2][0] = &one;

		delta_2 = -calcDeleterminantPtr(matrix);

		matrix[0][1] = &x_coord[j];
		matrix[1][1] = &x_coord[k];
		matrix[2][1] = &x_coord[l];

		delta_3 = calcDeleterminantPtr(matrix);

		matrix[0][2] = &y_coord[j];
		matrix[1][2] = &y_coord[k];
		matrix[2][2] = &y_coord[l];

		delta_4 = -calcDeleterminantPtr(matrix);

		m_a_coeff.at(i) = delta_1 / delta;
		m_b_coeff.at(i) = delta_2 / delta;
		m_c_coeff.at(i) = delta_3 / delta;
		m_d_coeff.at(i) = delta_4 / delta;
	}
}

FiniteElement::FiniteElement(unsigned int  id, const array<unsigned int, NODES_PER_ELEMENT>* nodes_id,
	const vector<array<double, COORDS_PER_NODE>>* coord_array) :
	m_id(id) {

	for (unsigned int i = 0; i < NODES_PER_ELEMENT; ++i)
		m_nodes_id.at(i) = nodes_id->at(i);

	initCenter(coord_array);
	initVolume(coord_array);
	initShapeFunctions(coord_array);
}

unsigned int  FiniteElement::getID() const {
	return m_id;
}

const array<unsigned int, NODES_PER_ELEMENT>* FiniteElement::getNodesId() const {
	return &m_nodes_id;
}

const array<double, COORDS_PER_NODE>* FiniteElement::getCenter() const {
	return &m_center;
}

double FiniteElement::getVolume() const {
	return m_volume;
}

const array<double, NODES_PER_ELEMENT>* FiniteElement::getCoeffsA() const {
	return &m_a_coeff;
}

const array<double, NODES_PER_ELEMENT>* FiniteElement::getCoeffsB() const {
	return &m_b_coeff;
}

const array<double, NODES_PER_ELEMENT>* FiniteElement::getCoeffsC() const {
	return &m_c_coeff;
}

const array<double, NODES_PER_ELEMENT>* FiniteElement::getCoeffsD() const {
	return &m_d_coeff;
}

double FiniteElement::calcDeterminant(const double matrix[][3]) const {
	return
		matrix[0][0] * matrix[1][1] * matrix[2][2] + matrix[0][1] * matrix[1][2] * matrix[2][0] +
		matrix[0][2] * matrix[1][0] * matrix[2][1] - matrix[0][2] * matrix[1][1] * matrix[2][0] -
		matrix[0][1] * matrix[1][0] * matrix[2][2] - matrix[0][0] * matrix[1][2] * matrix[2][1];
}