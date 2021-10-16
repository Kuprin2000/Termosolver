#pragma once
#include <array>
#include <vector>
#include <map>
#include <fstream>
#include <iostream>
#include <string>
#include <algorithm>
#include <cmath>
#include "FiniteElement.h"
#include "Edge.h"
#include "Surface.h"
#include "Defines.h"

using namespace std;

class DataLoader
{
private:
	ifstream m_file;
	vector<array<double, COORDS_PER_NODE>> m_coords;
	vector<FiniteElement> m_elements;
	multimap<long, int> m_boundary_edges_hash_table;
	vector<Edge> m_boundary_edges;
	vector<Surface> m_surfaces;
	map<int, array<int, COORDS_PER_NODE>>* m_node_examples;
	double m_heat_conduction_coeff;
	double m_max_coord;

private:
	void initHeatConduction();
	void initCoords();
	void initElements();
	void initEdges();
	bool initSufaces();

public:
	explicit DataLoader(const string& file_path);
	~DataLoader();
	bool loadData();
	const array<double, COORDS_PER_NODE>* getNodeCoord(int id) const;
	const FiniteElement* getElement(int id) const;
	const Edge* getIfBoundary(array<int, COORDS_PER_NODE>* indices) const;
	const Surface* getSurface(int id) const;
	double getHeatConductionCoeff() const;
	int getNodeCount() const;
	int getElementCount() const;
	int getSurfaceCount() const;
	double getMaxCoord() const;
	vector<int> getBoundaryNodes() const;

public:
	static long generateKey(array<int, COORDS_PER_NODE>* indices);
};