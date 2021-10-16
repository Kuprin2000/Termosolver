#pragma once
#include <array>
#include <vector>
#include <map>
#include <cmath>
#include <iostream>
#include "Defines.h"

using namespace std;

class FiniteElement {
private:
	int m_id;
	array<int, NODES_PER_ELEMENT> m_nodes_id;
	array<double, COORDS_PER_NODE> m_center;
	array<double, NODES_PER_ELEMENT> m_a_coeff, m_b_coeff, m_c_coeff, m_d_coeff;
	double m_volume;

private:
	void initCenter(const vector<array<double, COORDS_PER_NODE>>* coord_array);
	void initVolume(const vector<array<double, COORDS_PER_NODE>>* coord_array);
	void initShapeFunctions(const vector<array<double, COORDS_PER_NODE>>* coord_array);
	double calcDeleterminantPtr(double* matrix[3][3]) const;
	double calcDeterminant(const double matrix[][3]) const;

public:
	FiniteElement(int id, const array<int, NODES_PER_ELEMENT>* nodes_id,
		const vector<array<double, COORDS_PER_NODE>>* coord_array);
	int getID() const;
	const array<int, NODES_PER_ELEMENT>* getNodesId() const;
	const array<double, COORDS_PER_NODE>* getCenter() const;
	const array<double, NODES_PER_ELEMENT>* getCoeffsA() const;
	const array<double, NODES_PER_ELEMENT>* getCoeffsB() const;
	const array<double, NODES_PER_ELEMENT>* getCoeffsC() const;
	const array<double, NODES_PER_ELEMENT>* getCoeffsD() const;
	double getVolume() const;
};