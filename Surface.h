#pragma once
#include "Condition.h"
#include "Defines.h"

class Surface {
private:
	unsigned int m_id;
	Condition* m_condition;

public:
	Surface();
	Surface(unsigned int id, Condition* condition);
	unsigned int getId() const;
	Condition* getCondition() const;
	void deleteCondition();
};