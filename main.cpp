#include <iostream>
#include <conio.h>
#include <string>
#include "DataLoader.h"
#include "Solver.h"
#include "Exporter.h"

using namespace std;

int main(int argc, char* argv[]) {
	string file_path;

	if (argc != 2) {
		cout << "Unput file path" << endl;
		cin >> file_path;
	}

	else
		file_path = argv[1];

	DataLoader data_loader(file_path);

	if (!data_loader.loadData()) {
		_getch();
		return -1;
	}

	Solver solver(&data_loader);
	if (!solver.setGlobalArrays()) {
		_getch();
		return -1;
	}

	if (!solver.solve()) {
		_getch();
		return -1;
	}

	Exporter exporter(&data_loader, &solver);
	exporter.setExeFilePath(argv[0]);
	exporter.generateJSFile("/webgl sources/solver.js");
	exporter.genetateTxtFile("/result.txt");

	cout << "Press a key to exit";

	_getch();
	return 0;
}