#pragma once
#include <map>
#include <cmath>
#include <iostream>
#include "./lib/eigen/Eigen/SparseCore"
#include "./lib/eigen/Eigen/SparseLU"
#include  "./lib/eigen/Eigen/Dense"
#include  "./lib/eigen/Eigen/SparseCholesky"
#include "FiniteElement.h"
#include "Edge.h"
#include "Surface.h"
#include "Condition.h"
#include "DataLoader.h"
#include "Defines.h"

using namespace std;

class Solver
{
private:
	unsigned int m_number_of_nodes;
	double m_max_temperature;
	double m_min_temperature;
	const DataLoader* m_data_loader;
	map<pair<unsigned int, unsigned int>, double> m_global_matrix;
	map<unsigned int, double> m_global_vector;
	Eigen::VectorXd m_result;

private:
	void setupLocalNumeration(array<array<unsigned int, NODES_PER_EDGE>, EDGES_PER_ELEMENT>* local_numeration) const;
	void setToGlobalMatrix(unsigned int i, unsigned int j, double value);
	void addToGlobalMatrix(unsigned int i, unsigned int j, double value);
	double getFromGlobalMatrix(unsigned int i, unsigned int j) const;
	void setToGlobalVector(unsigned int i, double value);
	void addToGlobalVector(unsigned int i, double value);
	double getFromGlobalVector(unsigned int i) const;
	void setupBoundaryEdges(const array<array<unsigned int, NODES_PER_EDGE>, EDGES_PER_ELEMENT>* local_numeration,
		const array<unsigned int, NODES_PER_ELEMENT>* nodes_id,
		array<const Edge*, NODES_PER_ELEMENT>* boundary_edges) const;
	void initLocalMatrix(array<array<double, NODES_PER_ELEMENT>, NODES_PER_ELEMENT>* local_matrix,
		const FiniteElement* elem, double heat_conduction_coeff) const;
	void initLocalVector(array<double, NODES_PER_ELEMENT>* local_vector) const;
	void applyConstantTempCond(const map<unsigned int, double>* nodes_with_const_temp);
	void heatFlowCond(array<double, NODES_PER_ELEMENT>* local_vector,
		const array<unsigned int, NODES_PER_EDGE>* local_numeration,
		const FiniteElement* elem, const Edge* edge,
		const HeatFlowCondition* condition) const;
	void envirinmentHeatExchangeCond(array<array<double, NODES_PER_ELEMENT>, NODES_PER_ELEMENT>* local_matrix,
		array<double, NODES_PER_ELEMENT>* local_vector,
		const array<unsigned int, NODES_PER_EDGE>* local_numeration,
		const FiniteElement* elem,
		const Edge* edge,
		const EnvironmentHeatExchangeCondition* condition) const;

public:
	explicit Solver(const DataLoader* data_loader);
	bool setGlobalArrays();
	bool solve();
	double getTemperatureAtNode(unsigned int i) const;
	unsigned int getNodeCount() const;
	double getMaxTemperature() const;
	double getMinTemperature() const;
	void printTemperature() const;
};