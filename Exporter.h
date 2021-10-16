#pragma once
#include <fstream>
#include <iostream>
#include "DataLoader.h"
#include "Solver.h"
#include "Defines.h"

using namespace std;

class Exporter
{
private:
	string m_exe_file_path;
	const DataLoader* m_data_loader;
	const Solver* m_solver;

public:
	Exporter(const DataLoader* data_loader, const Solver* solver);
	void setExeFilePath(const string& file_path);
	void generateJSFile(const string& file_path) const;
	void genetateTxtFile(const string& file_path) const;
};

