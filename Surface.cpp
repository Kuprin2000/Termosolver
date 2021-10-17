#include "Surface.h"

Surface::Surface() : m_id(0), m_condition(nullptr) {
}

Surface::Surface(unsigned int id, Condition* condition) : m_id(id), m_condition(condition) {
}

unsigned int Surface::getId() const {
	return m_id;
}

Condition* Surface::getCondition() const {
	return m_condition;
}

void Surface::deleteCondition() {
	if (m_condition == nullptr)
		return;

	ConditionType condition_type = m_condition->getType();

	switch (condition_type) {
	case CONSTANT_TEMPERATURE:
		delete static_cast<ConstantTempCondition*>(m_condition);
		break;
	case NO_HEAT_EXCHANGE:
		delete static_cast<NoHeatExchangeCondition*>(m_condition);
		break;
	case HEAT_FLOW:
		delete static_cast<HeatFlowCondition*>(m_condition);
		break;
	case ENVIRONMENT_HEAT_EXCHANGE:
		delete static_cast<EnvironmentHeatExchangeCondition*>(m_condition);
		break;
	default:
		delete m_condition;
		break;
	}

	m_condition = nullptr;
}