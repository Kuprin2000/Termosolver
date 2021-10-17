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
	multimap<unsigned int, unsigned int > m_boundary_edges_hash_table;
	vector<Edge> m_boundary_edges;
	vector<Surface> m_surfaces;
	map<unsigned int, array<unsigned int, COORDS_PER_NODE>>* m_node_examples;
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
	const array<double, COORDS_PER_NODE>* getNodeCoord(unsigned int  id) const;
	const FiniteElement* getElement(unsigned int  id) const;
	const Edge* getIfBoundary(array<unsigned int, COORDS_PER_NODE>* indices) const;
	const Surface* getSurface(unsigned int  id) const;
	double getHeatConductionCoeff() const;
	unsigned int  getNodeCount() const;
	unsigned int  getElementCount() const;
	unsigned int  getSurfaceCount() const;
	double getMaxCoord() const;
	vector<unsigned int > getBoundaryNodes() const;
	void deletUselessData();

public:
	static unsigned int  generateKey(array<unsigned int, COORDS_PER_NODE>* indices);
};