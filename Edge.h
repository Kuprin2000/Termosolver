#pragma once
#include <vector>
#include <array>
#include "Defines.h"

using namespace std;

class Edge {
private:
	unsigned int  m_surface_id;
	double m_square;
	array <double, 3> m_center, m_point_a, m_point_b, m_point_c;
	array <unsigned int, NODES_PER_EDGE> m_right_order_of_ids;

public:
	Edge();
	Edge(unsigned int  surface_id, const array<unsigned int, NODES_PER_EDGE>* indices,
		const vector<array<double, COORDS_PER_NODE>>* coords);
	unsigned int  getSurfaceId() const;
	double getSquare() const;
	const array <double, COORDS_PER_NODE>* getCenter() const;
	const array <unsigned int, NODES_PER_EDGE>* getRightIdsOrder() const;
	const array<double, COORDS_PER_NODE>* getPointA() const;
	const array<double, COORDS_PER_NODE>* getPointB() const;
	const array<double, COORDS_PER_NODE>* getPointC() const;
};