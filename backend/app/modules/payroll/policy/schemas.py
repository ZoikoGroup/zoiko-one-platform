from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class EmployeeCategorySchema(BaseModel):
    model_config = {"extra": "ignore"}
    category:             str
    working_days:         int = Field(default=5, validation_alias="workingDays")
    expected_hours:       int = Field(default=8, validation_alias="expectedHours")
    minimum_hours:        int = Field(default=4, validation_alias="minimumHours")
    paid_leave_eligible:  bool = Field(default=True, validation_alias="paidLeaveEligible")
    grace_time_minutes:   int = Field(default=10, validation_alias="graceTimeMinutes")
    half_day_rule:        Optional[dict] = None


class OvertimeRuleSchema(BaseModel):
    model_config = {"extra": "ignore"}
    enabled:                    bool
    approval_required:          bool = Field(default=True, validation_alias="approvalRequired")
    minimum_overtime_minutes:   int = Field(default=30, validation_alias="minimumOvertimeMinutes")


class IntegrationSchema(BaseModel):
    model_config = {"extra": "ignore"}
    category:      str
    provider_key:  str = Field(validation_alias="providerKey")
    enabled:       bool


class FeatureFlagSchema(BaseModel):
    model_config = {"extra": "ignore"}
    flag_key:  str = Field(validation_alias="flagKey")
    enabled:   bool


class PolicyResponse(BaseModel):
    model_config = {"extra": "ignore", "from_attributes": True}
    id:                  int
    name:                str
    description:         Optional[str] = None
    status:              str
    effective_date:      date = Field(validation_alias="effectiveDate")
    is_default:          bool = Field(validation_alias="isDefault")
    calculation_mode:    str = Field(validation_alias="calculationMode")
    created_at:          Optional[datetime] = Field(default=None, validation_alias="createdAt")
    updated_at:          Optional[datetime] = Field(default=None, validation_alias="updatedAt")
    employee_categories: List[EmployeeCategorySchema] = Field(default_factory=list, validation_alias="employeeCategories")
    overtime_rule:       Optional[OvertimeRuleSchema] = Field(default=None, validation_alias="overtimeRule")
    integrations:        List[IntegrationSchema] = Field(default_factory=list)
    feature_flags:       List[FeatureFlagSchema] = Field(default_factory=list, validation_alias="featureFlags")
    leave_rules:         List[dict] = Field(default_factory=list, validation_alias="leaveRules")


class PolicyUpdate(BaseModel):
    model_config = {"extra": "ignore"}
    name:                Optional[str] = None
    description:         Optional[str] = None
    status:              Optional[str] = None
    effective_date:      Optional[date] = Field(default=None, validation_alias="effectiveDate")
    calculation_mode:    Optional[str] = Field(default=None, validation_alias="calculationMode")
    employee_categories: Optional[List[EmployeeCategorySchema]] = Field(default=None, validation_alias="employeeCategories")
    overtime_rule:       Optional[OvertimeRuleSchema] = Field(default=None, validation_alias="overtimeRule")
    integrations:        Optional[List[IntegrationSchema]] = None
    feature_flags:       Optional[List[FeatureFlagSchema]] = Field(default=None, validation_alias="featureFlags")


class PolicyIntegrationToggleResponse(BaseModel):
    model_config = {"extra": "ignore"}
    success:      bool
    category:     str
    provider_key: str = Field(validation_alias="providerKey")
    enabled:      bool
    message:      str = ""
