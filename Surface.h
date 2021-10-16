#pragma once
#include "Condition.h"
#include "Defines.h"

class Surface {
private:
	int m_id;
	Condition* m_condition;

public:
	Surface();
	Surface(int id, Condition* condition);
	int getId() const;
	Condition* getCondition() const;
	void deleteCondition();
};