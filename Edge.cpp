#include "Edge.h"

Edge::Edge() : 
	m_surface_id(-1), m_square(-1), m_center({ 0,0,0 }), m_point_a({ 0,0,0 }), m_point_b({ 0,0,0 }), m_point_c({ 0,0,0 }), m_right_order_of_ids({0,0,0}) {
}

Edge::Edge(int surface_id, const array<int, NODES_PER_EDGE>* indices, const vector<array<double, COORDS_PER_NODE>>* coords) :
	m_surface_id(surface_id), m_right_order_of_ids(*indices) {

	array<double, COORDS_PER_NODE>  coord_1, coord_2, coord_3;
	double x_accumulator, y_accumulator, z_accumulator;

	coord_1 = coords->at(indices->at(0));
	coord_2 = coords->at(indices->at(1));
	coord_3 = coords->at(indices->at(2));

	x_accumulator = coord_1.at(0) + coord_2.at(0) + coord_3.at(0);
	y_accumulator = coord_1.at(1) + coord_2.at(1) + coord_3.at(1);
	z_accumulator = coord_1.at(2) + coord_2.at(2) + coord_3.at(2);

	m_center.at(0) = x_accumulator / NODES_PER_EDGE;
	m_center.at(1) = y_accumulator / NODES_PER_EDGE;
	m_center.at(2) = z_accumulator / NODES_PER_EDGE;

	for (int i = 0; i < COORDS_PER_NODE; ++i) {
		m_point_a.at(i) = (coord_1.at(i) + coord_2.at(i)) / 2;
		m_point_b.at(i) = (coord_2.at(i) + coord_3.at(i)) / 2;
		m_point_c.at(i) = (coord_1.at(i) + coord_3.at(i)) / 2;
	}

	for (int i = 0; i < COORDS_PER_NODE; ++i) {
		coord_2.at(i) -= coord_1.at(i);
		coord_3.at(i) -= coord_1.at(i);
	}

	m_square = 0;
	m_square += pow(coord_2.at(1) * coord_3.at(2) - coord_2.at(2) * coord_3.at(1), 2);
	m_square += pow(coord_2.at(0) * coord_3.at(2) - coord_2.at(2) * coord_3.at(0), 2);
	m_square += pow(coord_2.at(0) * coord_3.at(1) - coord_2.at(1) * coord_3.at(0), 2);
	m_square = sqrt(m_square);
	m_square /= 2;
}

int Edge::getSurfaceId() const {
	return m_surface_id;
}

double Edge::getSquare() const {
	return m_square;
}

const array <double, 3>* Edge::getCenter() const {
	return &m_center;
}

const array<int, NODES_PER_EDGE>* Edge::getRightIdsOrder() const {
	return &m_right_order_of_ids;
}

const array<double, COORDS_PER_NODE>* Edge::getPointA() const {
	return &m_point_a;
}

const array<double, COORDS_PER_NODE>* Edge::getPointB() const {
	return &m_point_b;
}

const array<double, COORDS_PER_NODE>* Edge::getPointC() const {
	return &m_point_c;
}