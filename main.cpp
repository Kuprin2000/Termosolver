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
		cout << "This is a console application. You can use it from the command line or drag file and drop it on the application icon." << endl;
		_getch();
		return -1;
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

	data_loader.deleteSomeDataBeforeSolve();

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