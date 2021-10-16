#pragma once
#include <vector>
#include <array>
#include "Defines.h"

using namespace std;

class Edge {
private:
	int m_surface_id;
	double m_square;
	array <double, 3> m_center, m_point_a, m_point_b, m_point_c;
	array <int, NODES_PER_EDGE> m_right_order_of_ids;

public:
	Edge();
	Edge(int surface_id, const array<int, NODES_PER_EDGE>* indices,
		const vector<array<double, COORDS_PER_NODE>>* coords);
	int getSurfaceId() const;
	double getSquare() const;
	const array <double, COORDS_PER_NODE>* getCenter() const;
	const array <int, NODES_PER_EDGE>* getRightIdsOrder() const;
	const array<double, COORDS_PER_NODE>* getPointA() const;
	const array<double, COORDS_PER_NODE>* getPointB() const;
	const array<double, COORDS_PER_NODE>* getPointC() const;
};