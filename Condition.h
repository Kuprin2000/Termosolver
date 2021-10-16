#pragma once
#include "Defines.h"

enum ConditionType {
	NULL_CONDITION,
	CONSTANT_TEMPERATURE,
	NO_HEAT_EXCHANGE,
	HEAT_FLOW,
	ENVIRONMENT_HEAT_EXCHANGE,
};

class Condition {
protected:
	ConditionType m_type;

public:
	Condition();
	Condition(ConditionType type);
	ConditionType getType() const;
};

class ConstantTempCondition : public Condition {
private:
	double m_temperature;

public:
	explicit ConstantTempCondition(double temperature);
	double getTemperature() const;
};

class NoHeatExchangeCondition : public Condition {
public:
	NoHeatExchangeCondition();
};

class HeatFlowCondition : public Condition {
private:
	double m_flow;

public:
	HeatFlowCondition(double flow);
	double getFlow() const;
};

class EnvironmentHeatExchangeCondition : public Condition {
private:
	double m_environment_temp;
	double m_exchange_coeff;

public:
	EnvironmentHeatExchangeCondition(double environment_temp, double exchange_coeff);
	double getEnvironmentTemp() const;
	double getEchangeCoeff() const;
};