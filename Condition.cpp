#include "Condition.h"

Condition::Condition() : m_type(NULL_CONDITION) {
}

Condition::Condition(ConditionType type) : m_type(type) {
}

ConditionType Condition::getType() const {
	return m_type;
}

ConstantTempCondition::ConstantTempCondition(double temperature) :
	Condition(CONSTANT_TEMPERATURE), m_temperature(temperature) {
}

double ConstantTempCondition::getTemperature() const {
	return m_temperature;
}

NoHeatExchangeCondition::NoHeatExchangeCondition() : Condition(NO_HEAT_EXCHANGE) {
}

HeatFlowCondition::HeatFlowCondition(double flow) : Condition(HEAT_FLOW), m_flow(flow) {
}

double HeatFlowCondition::getFlow() const {
	return m_flow;
}

EnvironmentHeatExchangeCondition::EnvironmentHeatExchangeCondition(double environment_temp, double exchange_coeff) :
	Condition(ENVIRONMENT_HEAT_EXCHANGE), m_environment_temp(environment_temp), m_exchange_coeff(exchange_coeff) {
}

double EnvironmentHeatExchangeCondition::getEnvironmentTemp() const {
	return m_environment_temp;
}

double EnvironmentHeatExchangeCondition::getEchangeCoeff() const {
	return m_exchange_coeff;
}