import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import SuperAdminShell from "./components/SuperAdminShell";
import { flatRoutes } from "./navigation";
import { AlertTriangle } from "lucide-react";
import { ROLE_ALLOWED_PREFIXES } from "./config/roles";

function PagePlaceholderFallback({ title, path, badge }) {
  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Route: <span className="font-semibold text-slate-800">{path ?? "unknown"}</span></p>
        {badge && <p className="mt-2 text-sm text-slate-600">Badge: <span className="font-semibold text-[#FF7A00]">{badge}</span></p>}
        <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-500">
          Module page ready for implementation.
        </div>
      </div>
    </div>
  );
}
import HomePage from "./pages/public/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ZoikoProductsPage from "./pages/public/ZoikoProductsPage";
import PlatformPage from "./pages/public/PlatformPage";
import SolutionsPage from "./pages/public/SolutionsPage";
import PricingPage from "./pages/public/PricingPage";
import ContactPage from "./pages/public/ContactPage";
import ResourcesPage from "./pages/public/ResourcesPage";
import AboutPage from "./pages/public/AboutPage";
import ZoikoLeadershipPage from "./pages/public/ZoikoLeadershipPage";
import ZoikoCareersPage from "./pages/public/ZoikoCareersPage";
import ZoikoDemoPage from "./pages/public/ZoikoDemoPage";
import ZoikoHRPage from "./pages/products/ZoikoHRPage";
import ZoikoPayrollPage from "./pages/products/ZoikoPayrollPage";
import ZoikoTimePage from "./pages/products/ZoikoTimePage";
import ZoikoBillingPage from "./pages/products/ZoikoBillingPage";
import ZoikoProjectsPage from "./pages/products/ZoikoProjectsPage";
import ZoikoComplyPage from "./pages/products/ZoikoComplyPage";
import ZoikoSpendPage from "./pages/products/ZoikoSpendPage";
import ZoikoInventoryPage from "./pages/products/ZoikoInventoryPage";
import ZoikoDocsProPage from "./pages/products/ZoikoDocsProPage";
import ZoikoPeoplePage from "./pages/public/five-pillars/ZoikoPeoplePage";
import ZoikoMoneyPage from "./pages/public/five-pillars/ZoikoMoneyPage";
import ZoikoWorkPage from "./pages/public/five-pillars/ZoikoWorkPage";
import ZoikoSupplyPage from "./pages/public/five-pillars/ZoikoSupplyPage";
import ZoikoControlPage from "./pages/public/five-pillars/ZoikoControlPage";
import ZoikoHowItWorksPage from "./pages/platform/ZoikoHowItWorksPage";
import ZoikoSecurityPage from "./pages/platform/ZoikoSecurityPage";
import ZoikoTrustCenterPage from "./pages/platform/ZoikoTrustCenterPage";
import ZoikoConnectPage from "./pages/platform/ZoikoConnectPage";
import ZoikoApiDocsPage from "./pages/platform/ZoikoApiDocsPage";
import ZoikoSystemStatusPage from "./pages/platform/ZoikoSystemStatusPage";
import ZoikoEcosystemPage from "./pages/public/eco-system/ZoikoEcosystemPage";
import ZoikoVertexPage from "./pages/public/eco-system/ZoikoVertexPage";
import ZoikoSuitePage from "./pages/public/eco-system/ZoikoSuitePage";
import ZoikoSemaPage from "./pages/public/eco-system/ZoikoSemaPage";
import ZoikoLocalPage from "./pages/public/eco-system/ZoikoLocalPage";
import ZoikoDigitalPage from "./pages/public/eco-system/ZoikoDigitalPage";
import ProtectedRoute from "./components/ProtectedRoute";

// Target 'HrDashBoard.jsx' directly
import ZoikoHRModule from "./modules/zoiko-hr/HrDashBoard.jsx";

// Sub-module imports
import ZoikoHRLeaveDashboard from "./modules/zoiko-hr/leave/dashboard.jsx";
import ZoikoHRLeaveRequests from "./modules/zoiko-hr/leave/leave-requests.jsx";
import ZoikoHRLeaveCalendar from "./modules/zoiko-hr/leave/leave-calendar.jsx";
import ZoikoHRLeaveReports from "./modules/zoiko-hr/leave/reports.jsx";

import ZoikoHRDepartmentsDashboard from "./modules/zoiko-hr/departments/dashboard.jsx";
import ZoikoHRDepartmentsDepartmentList from "./modules/zoiko-hr/departments/department-list.jsx";
import ZoikoHRDepartmentsDepartmentStructure from "./modules/zoiko-hr/departments/department-structure.jsx";
import ZoikoHRDepartmentsReports from "./modules/zoiko-hr/departments/reports.jsx";
import ZoikoHRDepartmentsSettings from "./modules/zoiko-hr/departments/settings.jsx";

import ZoikoHRDesignationsDashboard from "./modules/zoiko-hr/designations/dashboard.jsx";
import ZoikoHRDesignationList from "./modules/zoiko-hr/designations/designation-list.jsx";
import ZoikoHRDesignationStructure from "./modules/zoiko-hr/designations/designation-structure.jsx";
import ZoikoHRDesignationReports from "./modules/zoiko-hr/designations/reports.jsx";
import ZoikoHRDesignationSettings from "./modules/zoiko-hr/designations/settings.jsx";

import PerformanceDashboard from "./modules/zoiko-hr/performance/dashboard.jsx";
import GoalsOKRs from "./modules/zoiko-hr/performance/goals.jsx";
import PerformanceReviews from "./modules/zoiko-hr/performance/reviews.jsx";
import Appraisals from "./modules/zoiko-hr/performance/appraisals.jsx";
import PerformanceAnalytics from "./modules/zoiko-hr/performance/analytics.jsx";
import RecruitmentDashboard from "./modules/zoiko-hr/recruitment/dashboard.jsx";
import JobRequisitions from "./modules/zoiko-hr/recruitment/job-requisitions.jsx";
import Candidates from "./modules/zoiko-hr/recruitment/candidates.jsx";
import Interviews from "./modules/zoiko-hr/recruitment/interviews.jsx";
import OfferManagement from "./modules/zoiko-hr/recruitment/offers.jsx";
import ZoikoHROnboardingDashboard from "./modules/zoiko-hr/onboarding/dashboard.jsx";
import ZoikoHROnboardingNewHires from "./modules/zoiko-hr/onboarding/new-hires.jsx";
import ZoikoHROnboardingPreOnboarding from "./modules/zoiko-hr/onboarding/pre-onboarding.jsx";
import ZoikoHROnboardingDocuments from "./modules/zoiko-hr/onboarding/documents.jsx";
import ZoikoHROnboardingChecklists from "./modules/zoiko-hr/onboarding/checklists.jsx";
import ZoikoHROnboardingOrientation from "./modules/zoiko-hr/onboarding/orientation.jsx";
import ZoikoHROnboardingReports from "./modules/zoiko-hr/onboarding/reports.jsx";
import ZoikoHROnboardingSettings from "./modules/zoiko-hr/onboarding/settings.jsx";
import ZoikoHRLearning from "./modules/zoiko-hr/learning/learning.jsx";

import EssDashboard from "./modules/zoiko-hr/ess/dashboard.jsx";
import EssProfile from "./modules/zoiko-hr/ess/profile.jsx";
import EssLeaveManagement from "./modules/zoiko-hr/ess/leave-management.jsx";
import EssAttendance from "./modules/zoiko-hr/ess/attendance.jsx";
import EssMyDocuments from "./modules/zoiko-hr/ess/my-documents.jsx";
import EssAssignedDocuments from "./modules/zoiko-hr/ess/assigned-documents.jsx";
import EssRequests from "./modules/zoiko-hr/ess/requests.jsx";
import EssSettings from "./modules/zoiko-hr/ess/settings.jsx";

import TravelDashboard from "./modules/zoiko-hr/travel/dashboard.jsx";
import TravelRequests from "./modules/zoiko-hr/travel/travel-requests.jsx";
import TravelApprovals from "./modules/zoiko-hr/travel/approvals.jsx";
import TravelExpenses from "./modules/zoiko-hr/travel/expenses.jsx";
import TravelSettings from "./modules/zoiko-hr/travel/settings.jsx";

import {
  AssetsDashboard,
  MyAssets,
  AssetCatalog,
  AssetRequests,
  AssetMaintenance,
  AssetReports,
  AssetSettings,
} from "./modules/zoiko-hr/assets/index.jsx";

import DocumentsDashboard from "./modules/zoiko-hr/documents/dashboard.jsx";
import EmployeeDocuments from "./modules/zoiko-hr/documents/employee-documents.jsx";
import CompanyDocuments from "./modules/zoiko-hr/documents/company-documents.jsx";
import ApprovalWorkflow from "./modules/zoiko-hr/documents/approvals.jsx";

import ZoikoHRAttendanceDashboard from "./modules/zoiko-hr/attendance/dashboard.jsx";
import ZoikoHRAttendanceDailyRecords from "./modules/zoiko-hr/attendance/daily-records.jsx";
import ZoikoHRAttendanceLeaves from "./modules/zoiko-hr/attendance/leave-management.jsx";
import ZoikoHRAttendanceShifts from "./modules/zoiko-hr/attendance/shifts.jsx";
import ZoikoHRAttendanceHolidays from "./modules/zoiko-hr/attendance/holidays.jsx";
import ZoikoHRAttendanceAnalytics from "./modules/zoiko-hr/attendance/analytics.jsx";

import WorkforceDashboard from "./modules/zoiko-hr/workforce-planning/dashboard.jsx";
import WorkforcePlans from "./modules/zoiko-hr/workforce-planning/plans.jsx";
import HeadcountPlanning from "./modules/zoiko-hr/workforce-planning/headcount.jsx";
import Succession from "./modules/zoiko-hr/workforce-planning/succession.jsx";
import WorkforceReports from "./modules/zoiko-hr/workforce-planning/reports.jsx";

import ZoikoHRCompDashboard from "./modules/zoiko-hr/compensation/dashboard.jsx";
import ZoikoHRCompSalaryStructures from "./modules/zoiko-hr/compensation/salary-structures.jsx";
import ZoikoHRCompPayGrades from "./modules/zoiko-hr/compensation/pay-grades.jsx";
import ZoikoHRCompSalaryComponents from "./modules/zoiko-hr/compensation/salary-components.jsx";
import ZoikoHRCompBands from "./modules/zoiko-hr/compensation/compensation-bands.jsx";
import ZoikoHRCompRevisions from "./modules/zoiko-hr/compensation/salary-revisions.jsx";
import ZoikoHRCompAllowances from "./modules/zoiko-hr/compensation/allowances.jsx";
import ZoikoHRCompBenefits from "./modules/zoiko-hr/compensation/benefits.jsx";

import ZoikoHRDashboard from "./pages/Peoples/Employees/EmployeeManagement/dashboard.jsx";
import ZoikoHREmployees from "./pages/Peoples/Employees/EmployeeManagement/employees.jsx";
import ZoikoHRProfile from "./pages/Peoples/Employees/EmployeeManagement/profile.jsx";
import ZoikoHROrgChart from "./pages/Peoples/Employees/EmployeeManagement/organization.jsx";
import ZoikoHRLifecycle from "./pages/Peoples/Employees/EmployeeManagement/lifecycle.jsx";
import ZoikoHRReports from "./pages/Peoples/Employees/EmployeeManagement/reports.jsx";

import ZoikoTimeModule from "./modules/zoikotime";
import ZoikoPayrollModule from "./modules/payroll";

import {
  ZoikoSpendModule,
  PurchaseRequestsPage,
  PosPage,
  VendorsPage,
  SupplierInvoicesPage,
  ApWorkflowPage,
  SpendPolicyPage,
  SpendApprovalsPage,
  PaymentPreparationPage,
} from "./modules/spend";
import {
  ZoikoBillingModule,
  InvoicingPage,
  InvoiceSchedulesPage,
  UsageBillingPage,
  TaxPage,
  CollectionsReceivablesPage,
  CreditNotesPage,
  DunningPage,
  ReportsPage,
  BillingSettingsPage,
  CustomerDashboardPage,
  CustomerListPage,
  CustomerProfilePage,
  CustomerBillingHistoryPage,
  CustomerReportsPage,
  CustomerSettingsPage,
  ProductDashboardPage,
  ProductListPage,
  ProductCategoriesPage,
  ProductPricingPlansPage,
  ProductReportsPage,
  ProductSettingsPage,
  PricingDashboardPage,
  PricingPlansPage,
  TierManagementPage,
  PricingReportsPage,
  PricingSettingsPage,
  QuotationListPage,
  QuotationDetailPage,
  QuotationReportsPage,
  QuotationSettingsPage,
  ContractListPage,
  ContractDetailPage,
  ContractReportsPage,
  ContractSettingsPage,
  SubscriptionsPage as BillingSubscriptionsPage,
  SubscriptionDetailPage as BillingSubscriptionDetailPage,
  SubscriptionReportsPage,
  SubscriptionSettingsPage,
  RetainersPage,
  MoneyInPage,
  PaymentDetailPage,
  ReceivablesPage,
  CollectionsPage,
  CreditsPage,
  InvoiceDetailPage,
  InvoiceReportsPage,
  InvoiceSettingsPage,
  PaymentReportsPage,
  PaymentSettingsPage,
  TaxReportsPage,
  TaxConfigurationPage,
  TaxSettingsPage,
} from "./modules/billing";
import ComplyDashboard from "./modules/comply/dashboard";
import ComplyPolicies from "./modules/comply/policies";
import ComplyAudits from "./modules/comply/audits";
import ComplyIncidents from "./modules/comply/incidents";
import ComplyCertifications from "./modules/comply/certifications";
import ComplyComplianceMonitoring from "./modules/comply/compliance-monitoring";
import ComplyReports from "./modules/comply/reports";
import ComplySettings from "./modules/comply/settings";
import ComplyRiskManagement from "./modules/comply/risk-management";
import ComplyControls from "./modules/comply/controls";
import ComplyTraining from "./modules/comply/compliance-training";
import InsightsDashboard from "./modules/insights/dashboard.jsx";
import WorkforceInsights from "./modules/insights/workforce-insights.jsx";
import PayrollInsights from "./modules/insights/payroll-insights.jsx";
import Analytics from "./modules/insights/analytics.jsx";
import Reports from "./modules/insights/reports.jsx";
import AttendanceInsights from "./modules/insights/attendance-insights.jsx";
import PerformanceInsights from "./modules/insights/performance-insights.jsx";
import RecruitmentInsights from "./modules/insights/recruitment-insights.jsx";
import InsightsSettings from "./modules/insights/settings.jsx";
import ItemsPage from "./modules/inventory/pages/ItemsPage";
import InventoryModule from "./modules/inventory/index.jsx";

// Organization Admin modules
import OrgAdminDashboardPage from "./modules/organization-admin/DashboardPage";
import OrgAdminOrganizationPage from "./modules/organization-admin/OrganizationPage";
import OrgAdminAssetRequestsPage from "./modules/organization-admin/AssetRequestsPage";
import OrgAdminAssetsPage from "./modules/organization-admin/AssetsPage";
import OrgAdminEmployeeDocumentsPage from "./modules/organization-admin/EmployeeDocumentsPage";

// HR Admin modules
import HrAdminDashboardPage from "./modules/hr-admin/DashboardPage";
import HrAdminOrganizationPage from "./modules/hr-admin/OrganizationPage";

// Platform Governance modules
import RolesPage from "./modules/governance/RolesPage";

// Super Admin modules
import SuperAdminDashboardPage from "./modules/super-admin/DashboardPage";
import SuperAdminOrganizationsPage from "./modules/super-admin/OrganizationsPage";
import SuperAdminProductsPage from "./modules/super-admin/ProductsPage";
import SuperAdminSubscriptionsPage from "./modules/super-admin/SubscriptionsPage";
import SuperAdminPlatformUsersPage from "./modules/super-admin/PlatformUsersPage";
import SuperAdminAnalyticsPage from "./modules/super-admin/AnalyticsPage";
import SuperAdminAuditLogsPage from "./modules/super-admin/AuditLogsPage";
import SuperAdminSystemHealthPage from "./modules/super-admin/SystemHealthPage";
import SuperAdminPlatformSettingsPage from "./modules/super-admin/PlatformSettingsPage";
import NotificationCenter from "./modules/super-admin/NotificationCenter";
import SecurityCenter from "./modules/super-admin/SecurityCenter";
import SupportCenter from "./modules/super-admin/SupportCenter";
import PendingOrganizationsPage from "./modules/super-admin/PendingOrganizationsPage";
import OrganizationDetailPage from "./modules/super-admin/OrganizationDetailPage";
import SecurityPage from "./modules/governance/SecurityPage";
import AuditPage from "./modules/governance/AuditPage";
import CompliancePage from "./modules/governance/CompliancePage";

// Platform Command modules
import DashboardPage from "./modules/platform/DashboardPage";
import OrganizationsPage from "./modules/platform/OrganizationsPage";
import SubscriptionsPage from "./modules/platform/SubscriptionsPage";

// Platform Operations modules
import AdminProfilePage from "./modules/operations/AdminProfilePage";
import IntegrationsPage from "./modules/operations/IntegrationsPage";
import ApiManagementPage from "./modules/operations/ApiManagementPage";
import FeatureFlagsPage from "./modules/operations/FeatureFlagsPage";
import NotificationsPage from "./modules/operations/NotificationsPage";
import SystemMonitoringPage from "./modules/operations/SystemMonitoringPage";
import SupportCenterPage from "./modules/operations/SupportCenterPage";

// Shared Layers modules
import ZoikoIdPage from "./modules/shared-layers/ZoikoIdPage";
import ZoikoWorkflowPage from "./modules/shared-layers/ZoikoWorkflowPage";
import ZoikoHubPage from "./modules/shared-layers/ZoikoHubPage";
import ZoikoConnectPageModule from "./modules/shared-layers/ZoikoConnectPage";
import DocumentsPage from "./modules/shared-layers/DocumentsPage";
import ApprovalsPage from "./modules/shared-layers/ApprovalsPage";
import ExpensesPage from "./modules/shared-layers/ExpensesPage";
import AiAssistancePage from "./modules/shared-layers/AiAssistancePage";
import UserManagementPage from "./modules/settings/UserManagementPage";

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE WORKSPACE — src/pages/Peoples/Employees/
// Filenames use capital E prefix: Employee_ (except EmployeeProfile.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// Profile folder
import EmployeeProfilePage       from "./pages/Peoples/Employees/Profile/EmployeeProfile.jsx";
import EmployeeBankDetails       from "./pages/Peoples/Employees/Profile/Employee_BankDetails.jsx";
import EmployeeAssetDetails      from "./pages/Peoples/Employees/Profile/Employee_AssetDetails.jsx";
import EmployeeEmergencyContacts from "./pages/Peoples/Employees/Profile/Employee_EmergencyContacts.jsx";
import EmployeeSecuritySettings  from "./pages/Peoples/Employees/Profile/Employee_settings.jsx";

// ESS folder
import EmployeeEssDashboard  from "./pages/Peoples/Employees/ESS/Employee_EssDashboard.jsx";
import EmployeeEssAttendance from "./pages/Peoples/Employees/ESS/Employee_EssAttendance.jsx";
import EmployeeEssRequests   from "./pages/Peoples/Employees/ESS/EmployeeLearning.jsx";
import EmployeeEssSettings   from "./pages/Peoples/Employees/ESS/Employee_EssSettings.jsx";

// Leaves folder
import EmployeeMyLeave       from "./pages/Peoples/Employees/Leaves/Employee_ApplyLeave.jsx";
import EmployeeApplyLeave    from "./pages/Peoples/Employees/Leaves/Employee_ApplyLeaveForm.jsx";
import EmployeeLeaveCalendar from "./pages/Peoples/Employees/Leaves/Employee_LeaveCalendar.jsx";
import EmployeeLeaveHistory  from "./pages/Peoples/Employees/Leaves/Employee_LeaveHistory.jsx";
// Documents folder
import EmployeeMyFiles        from "./pages/Peoples/Employees/Documents/Employee_MyFiles.jsx";
import EmployeePayslips       from "./pages/Peoples/Employees/Documents/Employee_Payslips.jsx";
import EmployeeOfferContracts from "./pages/Peoples/Employees/Documents/Employee_OfferContracts.jsx";
import EmployeeTaxCompliance  from "./pages/Peoples/Employees/Documents/Employee_TaxCompliance.jsx";
import EmployeeUploadRequest  from "./pages/Peoples/Employees/Documents/Employee_UploadRequest.jsx";
import EmployeeCompanyDocuments from "./pages/Peoples/Employees/Documents/Employee_CompanyDocuments.jsx";

// Travel folder — files must be named Employee_TravelDashboard.jsx etc.
import EmployeeTravelDashboard  from "./pages/Peoples/Employees/Travel/Employee_TravelDashboard.jsx";
import EmployeeTravelRequests   from "./pages/Peoples/Employees/Travel/Employee_TravelRequests.jsx";
import EmployeeTravelApprovals  from "./pages/Peoples/Employees/Travel/Employee_TravelApprovals.jsx";
import EmployeeTravelExpenses   from "./pages/Peoples/Employees/Travel/Employee_TravelExpenses.jsx";
import EmployeeTravelSettings   from "./pages/Peoples/Employees/Travel/Employee_TravelSettings.jsx";

const routeOverrides = {
  "/dashboard": <DashboardPage />,
  "/organizations": <OrganizationsPage />,
  "/subscriptions": <SubscriptionsPage />,
  "/shared/id": <ZoikoIdPage />,
  "/shared/workflow": <ZoikoWorkflowPage />,
  "/shared/hub": <ZoikoHubPage />,
  "/shared/connect": <ZoikoConnectPageModule />,
  "/shared/documents": <DocumentsPage />,
  "/shared/approvals": <ApprovalsPage />,
  "/shared/expenses": <ExpensesPage />,
  "/shared/ai-assistance": <AiAssistancePage />,
  "/zoiko-hr": <ZoikoHRModule />,
  // Departments
  "/zoiko-hr/departments": <ZoikoHRDepartmentsDashboard />,
  "/zoiko-hr/departments/list": <ZoikoHRDepartmentsDepartmentList />,
  "/zoiko-hr/departments/structure": <ZoikoHRDepartmentsDepartmentStructure />,
  "/zoiko-hr/departments/reports": <ZoikoHRDepartmentsReports />,
  "/zoiko-hr/departments/settings": <ZoikoHRDepartmentsSettings />,
  // Designations
  "/zoiko-hr/designations": <ZoikoHRDesignationsDashboard />,
  "/zoiko-hr/designations/list": <ZoikoHRDesignationList />,
  "/zoiko-hr/designations/levels": <ZoikoHRDesignationStructure />,
  "/zoiko-hr/designations/reports": <ZoikoHRDesignationReports />,
  "/zoiko-hr/designations/settings": <ZoikoHRDesignationSettings />,
  // Leave
  "/zoiko-hr/leave": <ZoikoHRLeaveDashboard />,
  "/zoiko-hr/leave/requests": <ZoikoHRLeaveRequests />,
  "/zoiko-hr/leave/calendar": <ZoikoHRLeaveCalendar />,
  "/zoiko-hr/leave/reports": <ZoikoHRLeaveReports />,
  // Attendance
  "/zoiko-hr/attendance": <ZoikoHRAttendanceDashboard />,
  "/zoiko-hr/attendance/daily": <ZoikoHRAttendanceDailyRecords />,
  "/zoiko-hr/attendance/leaves": <ZoikoHRAttendanceLeaves />,
  "/zoiko-hr/attendance/shifts": <ZoikoHRAttendanceShifts />,
  "/zoiko-hr/attendance/holidays": <ZoikoHRAttendanceHolidays />,
  "/zoiko-hr/attendance/analytics": <ZoikoHRAttendanceAnalytics />,
  "/zoiko-hr/performance": <PerformanceDashboard />,
  "/zoiko-hr/recruitment": <RecruitmentDashboard />,
  "/zoiko-hr/onboarding": <ZoikoHROnboardingDashboard />,
  "/zoiko-hr/onboarding/new-hires": <ZoikoHROnboardingNewHires />,
  "/zoiko-hr/onboarding/pre-onboarding": <ZoikoHROnboardingPreOnboarding />,
  "/zoiko-hr/onboarding/documents": <ZoikoHROnboardingDocuments />,
  "/zoiko-hr/onboarding/checklists": <ZoikoHROnboardingChecklists />,
  "/zoiko-hr/onboarding/orientation": <ZoikoHROnboardingOrientation />,
  "/zoiko-hr/onboarding/reports": <ZoikoHROnboardingReports />,
  "/zoiko-hr/onboarding/settings": <ZoikoHROnboardingSettings />,
  // Assets
  "/zoiko-hr/assets": <AssetsDashboard />,
  "/zoiko-hr/assets/my-assets": <MyAssets />,
  "/zoiko-hr/assets/catalog": <AssetCatalog />,
  "/zoiko-hr/assets/requests": <AssetRequests />,
  "/zoiko-hr/assets/maintenance": <AssetMaintenance />,
  "/zoiko-hr/assets/reports": <AssetReports />,
  "/zoiko-hr/assets/settings": <AssetSettings />,
  // Learning
  "/zoiko-hr/learning": <ZoikoHRLearning />,
  "/zoiko-hr/learning/courses": <ZoikoHRLearning />,
  "/zoiko-hr/learning/training-programs": <ZoikoHRLearning />,
  "/zoiko-hr/learning/assessments": <ZoikoHRLearning />,
  "/zoiko-hr/learning/reports": <ZoikoHRLearning />,
  // Compensation
  "/zoiko-hr/compensation": <ZoikoHRCompDashboard />,
  "/zoiko-hr/compensation/salary-structures": <ZoikoHRCompSalaryStructures />,
  "/zoiko-hr/compensation/pay-grades": <ZoikoHRCompPayGrades />,
  "/zoiko-hr/compensation/salary-components": <ZoikoHRCompSalaryComponents />,
  "/zoiko-hr/compensation/bands": <ZoikoHRCompBands />,
  "/zoiko-hr/compensation/revisions": <ZoikoHRCompRevisions />,
  "/zoiko-hr/compensation/allowances": <ZoikoHRCompAllowances />,
  "/zoiko-hr/compensation/benefits": <ZoikoHRCompBenefits />,
  // ESS (HR admin view)
  "/zoiko-hr/ess": <EssDashboard />,
  "/zoiko-hr/ess/profile": <EssProfile />,
  "/zoiko-hr/ess/leave": <EssLeaveManagement />,
  "/zoiko-hr/ess/attendance": <EssAttendance />,
  "/zoiko-hr/ess/my-documents": <EssMyDocuments />,
  "/zoiko-hr/ess/assigned-documents": <EssAssignedDocuments />,
  "/zoiko-hr/ess/requests": <EssRequests />,
  "/zoiko-hr/ess/settings": <EssSettings />,
  // Travel (HR admin view)
  "/zoiko-hr/travel": <TravelDashboard />,
  "/zoiko-hr/travel/requests": <TravelRequests />,
  "/zoiko-hr/travel/approvals": <TravelApprovals />,
  "/zoiko-hr/travel/expenses": <TravelExpenses />,
  "/zoiko-hr/travel/settings": <TravelSettings />,
  // Employee Management
  "/zoiko-hr/employee-management": <ZoikoHRDashboard />,
  "/zoiko-hr/employee-management/employees": <ZoikoHREmployees />,
  "/zoiko-hr/employee-management/employees/:id": <ZoikoHRProfile />,
  "/zoiko-hr/employee-management/organization": <ZoikoHROrgChart />,
  "/zoiko-hr/employee-management/lifecycle": <ZoikoHRLifecycle />,
  "/zoiko-hr/employee-management/reports": <ZoikoHRReports />,
  // Recruitment
  "/zoiko-hr/recruitment/job-requisitions": <JobRequisitions />,
  "/zoiko-hr/recruitment/candidates": <Candidates />,
  "/zoiko-hr/recruitment/interviews": <Interviews />,
  "/zoiko-hr/recruitment/offers": <OfferManagement />,
  // Performance
  "/zoiko-hr/performance/goals": <GoalsOKRs />,
  "/zoiko-hr/performance/reviews": <PerformanceReviews />,
  "/zoiko-hr/performance/appraisals": <Appraisals />,
  "/zoiko-hr/performance/analytics": <PerformanceAnalytics />,
  // Documents
  "/zoiko-hr/documents": <DocumentsDashboard />,
  "/zoiko-hr/documents/employee-documents": <EmployeeDocuments />,
  "/zoiko-hr/documents/company-documents": <CompanyDocuments />,
  "/zoiko-hr/documents/approvals": <ApprovalWorkflow />,
  "/zoiko-hr/documents/employee-upload": <OrgAdminEmployeeDocumentsPage />,
  // Workforce Planning
  "/zoiko-hr/workforce-planning": <WorkforceDashboard />,
  "/zoiko-hr/workforce-planning/plans": <WorkforcePlans />,
  "/zoiko-hr/workforce-planning/headcount": <HeadcountPlanning />,
  "/zoiko-hr/workforce-planning/succession": <Succession />,
  "/zoiko-hr/workforce-planning/reports": <WorkforceReports />,
  "/zoikotime": <ZoikoTimeModule />,
  // Payroll
  "/payroll": <ZoikoPayrollModule />,
  "/payroll/employees": <ZoikoPayrollModule />,
  "/payroll/payroll-runs": <ZoikoPayrollModule />,
  "/payroll/payslips": <ZoikoPayrollModule />,
  "/payroll/compliances": <ZoikoPayrollModule />,
  "/payroll/attendance":  <ZoikoPayrollModule />,
  "/payroll/leaves":      <ZoikoPayrollModule />,
  "/payroll/reports":     <ZoikoPayrollModule />,
  // Spend
  "/spend/purchase-requests": <PurchaseRequestsPage />,
  "/spend/purchase-orders": <PosPage />,
  "/spend/vendors": <VendorsPage />,
  "/spend/supplier-invoices": <SupplierInvoicesPage />,
  "/spend/ap-workflow": <ApWorkflowPage />,
  "/spend/spend-policy": <SpendPolicyPage />,
  "/spend/approvals": <SpendApprovalsPage />,
  "/spend/payment-preparation": <PaymentPreparationPage />,
  // Billing
  "/billing": <ZoikoBillingModule />,
  "/billing/customers": <CustomerListPage />,
  "/billing/customers/dashboard": <CustomerDashboardPage />,
  "/billing/customers/:id": <CustomerProfilePage />,
  "/billing/customers/billing-history": <CustomerBillingHistoryPage />,
  "/billing/customers/reports": <CustomerReportsPage />,
  "/billing/customers/settings": <CustomerSettingsPage />,
  "/billing/products": <ProductListPage />,
  "/billing/products/dashboard": <ProductDashboardPage />,
  "/billing/products/categories": <ProductCategoriesPage />,
  "/billing/products/pricing-plans": <ProductPricingPlansPage />,
  "/billing/products/reports": <ProductReportsPage />,
  "/billing/products/settings": <ProductSettingsPage />,
  "/billing/pricing": <PricingPlansPage />,
  "/billing/pricing/dashboard": <PricingDashboardPage />,
  "/billing/pricing/tier-management": <TierManagementPage />,
  "/billing/pricing/reports": <PricingReportsPage />,
  "/billing/pricing/settings": <PricingSettingsPage />,
  "/billing/quotations": <QuotationListPage />,
  "/billing/quotations/:id": <QuotationDetailPage />,
  "/billing/quotations/reports": <QuotationReportsPage />,
  "/billing/quotations/settings": <QuotationSettingsPage />,
  "/billing/contracts": <ContractListPage />,
  "/billing/contracts/:id": <ContractDetailPage />,
  "/billing/contracts/reports": <ContractReportsPage />,
  "/billing/contracts/settings": <ContractSettingsPage />,
  "/billing/subscriptions": <BillingSubscriptionsPage />,
  "/billing/subscriptions/:id": <BillingSubscriptionDetailPage />,
  "/billing/subscriptions/reports": <SubscriptionReportsPage />,
  "/billing/subscriptions/settings": <SubscriptionSettingsPage />,
  "/billing/invoices": <InvoicingPage />,
  "/billing/invoices/:id": <InvoiceDetailPage />,
  "/billing/invoice-schedules": <InvoiceSchedulesPage />,
  "/billing/usage-billing": <UsageBillingPage />,
  "/billing/tax": <TaxPage />,
  "/billing/tax/configuration": <TaxConfigurationPage />,
  "/billing/tax/reports": <TaxReportsPage />,
  "/billing/tax/settings": <TaxSettingsPage />,
  "/billing/collections-receivables": <CollectionsReceivablesPage />,
  "/billing/credit-notes": <CreditNotesPage />,
  "/billing/dunning": <DunningPage />,
  "/billing/reports": <ReportsPage />,
  "/billing/settings": <BillingSettingsPage />,
  "/billing/payments": <MoneyInPage />,
  "/billing/payments/:id": <PaymentDetailPage />,
  "/billing/receivables": <ReceivablesPage />,
  "/billing/collections": <CollectionsPage />,
  "/billing/credits": <CreditsPage />,
  "/billing/retainers": <RetainersPage />,
  "/billing/invoicing/reports": <InvoiceReportsPage />,
  "/billing/invoicing/settings": <InvoiceSettingsPage />,
  "/billing/payments/reports": <PaymentReportsPage />,
  "/billing/payments/settings": <PaymentSettingsPage />,
  // Inventory
  "/inventory/items": <ItemsPage />,
  "/inventory/locations": <InventoryModule />,
  "/inventory/stock": <InventoryModule />,
  "/inventory/receiving": <InventoryModule />,
  "/inventory/goods-issue": <InventoryModule />,
  "/inventory/transfers": <InventoryModule />,
  "/inventory/stock-counts": <InventoryModule />,
  "/inventory/reorder": <InventoryModule />,
  "/inventory/assets": <InventoryModule />,
  "/inventory/reports": <InventoryModule />,
  // Comply
  "/comply": <ComplyDashboard />,
  "/comply/policies": <ComplyPolicies />,
  "/comply/audits": <ComplyAudits />,
  "/comply/incidents": <ComplyIncidents />,
  "/comply/certifications": <ComplyCertifications />,
  "/comply/compliance-monitoring": <ComplyComplianceMonitoring />,
  "/comply/reports": <ComplyReports />,
  "/comply/settings": <ComplySettings />,
  "/comply/risk-management": <ComplyRiskManagement />,
  "/comply/controls": <ComplyControls />,
  "/comply/training": <ComplyTraining />,
  // Insights
  "/insights": <InsightsDashboard />,
  "/insights/workforce": <WorkforceInsights />,
  "/insights/payroll": <PayrollInsights />,
  "/insights/financial": <Analytics defaultTab="financial" />,
  "/insights/projects": <Analytics defaultTab="projects" />,
  "/insights/inventory": <Analytics defaultTab="inventory" />,
  "/insights/compliance": <Analytics defaultTab="compliance" />,
  "/insights/forecasting": <Analytics defaultTab="forecasting" />,
  "/insights/analytics": <Analytics />,
  "/insights/custom-reports": <Reports defaultTab="custom" />,
  "/insights/saved-reports": <Reports defaultTab="saved" />,
  "/insights/reports": <Reports />,
  "/insights/attendance": <AttendanceInsights />,
  "/insights/performance": <PerformanceInsights />,
  "/insights/recruitment": <RecruitmentInsights />,
  "/insights/settings": <InsightsSettings />,
  // Governance
  "/roles": <RolesPage />,
  "/security-center": <SecurityPage />,
  "/audit-center": <AuditPage />,
  "/compliance-center": <CompliancePage />,
  // Operations
  "/operations/integrations": <IntegrationsPage />,
  "/operations/api-management": <ApiManagementPage />,
  "/operations/feature-flags": <FeatureFlagsPage />,
  "/operations/notifications": <NotificationsPage />,
  "/operations/system-monitoring": <SystemMonitoringPage />,
  "/operations/support-center": <SupportCenterPage />,
  "/admin-profile": <AdminProfilePage />,
  "/settings/user-management": <UserManagementPage />,
  // Organization Admin
  "/organization-admin/dashboard": <OrgAdminDashboardPage />,
  "/organization-admin/organization": <OrgAdminOrganizationPage />,
  "/organization-admin/assets": <OrgAdminAssetsPage />,
  "/organization-admin/assets/requests": <OrgAdminAssetRequestsPage />,
  // HR Admin
  "/hr-admin/dashboard": <HrAdminDashboardPage />,
  "/hr-admin/my-organization": <HrAdminOrganizationPage />,
  "/hr-admin/employees": <ZoikoHREmployees />,
  "/hr-admin/departments": <ZoikoHRDepartmentsDepartmentList />,
  "/hr-admin/designations": <ZoikoHRDesignationList />,
  "/hr-admin/attendance": <ZoikoHRAttendanceDashboard />,
  "/hr-admin/leave": <ZoikoHRLeaveDashboard />,
  "/hr-admin/onboarding": <ZoikoHROnboardingDashboard />,
  "/hr-admin/recruitment": <RecruitmentDashboard />,
  "/hr-admin/performance": <PerformanceDashboard />,
  "/hr-admin/assets": <AssetsDashboard />,
  "/hr-admin/learning": <ZoikoHRLearning />,
  "/hr-admin/documents": <DocumentsDashboard />,
  "/hr-admin/reports": <ZoikoHRReports />,
  "/hr-admin/settings": <UserManagementPage />,
  // Super Admin
  "/super-admin/dashboard": <SuperAdminDashboardPage />,
  "/super-admin/organizations": <SuperAdminOrganizationsPage />,
  "/super-admin/organizations/:orgId": <OrganizationDetailPage />,
  "/super-admin/products": <SuperAdminProductsPage />,
  "/super-admin/subscriptions": <SuperAdminSubscriptionsPage />,
  "/super-admin/users": <SuperAdminPlatformUsersPage />,
  "/super-admin/analytics": <SuperAdminAnalyticsPage />,
  "/super-admin/audit-logs": <SuperAdminAuditLogsPage />,
  "/super-admin/system-health": <SuperAdminSystemHealthPage />,
  "/super-admin/settings": <SuperAdminPlatformSettingsPage />,
  "/super-admin/approvals": <PendingOrganizationsPage />,
  "/super-admin/notifications": <NotificationCenter />,
  "/super-admin/security-events": <SecurityCenter />,
  "/super-admin/support-tickets": <SupportCenter />,

  // ─────────────────────────────────────────────────────────────────────────
  // EMPLOYEE WORKSPACE — /employee/* routes (role: employee only)
  // ─────────────────────────────────────────────────────────────────────────

  // Profile
  "/employee/profile":                    <EmployeeProfilePage />,
  "/employee/profile/bank-details":       <EmployeeBankDetails />,
  "/employee/profile/assets":             <EmployeeAssetDetails />,
  "/employee/profile/emergency-contacts": <EmployeeEmergencyContacts />,
  "/employee/profile/settings":           <EmployeeSecuritySettings />,

  // ESS
  "/employee/ess":            <EmployeeEssDashboard />,
  "/employee/ess/attendance": <EmployeeEssAttendance />,
  "/employee/ess/requests":   <EmployeeEssRequests />,
  "/employee/ess/settings":   <EmployeeEssSettings />,

  // Leaves
  "/employee/leaves":          <EmployeeMyLeave />,
  "/employee/leaves/apply":    <EmployeeApplyLeave />,
  "/employee/leaves/calendar": <EmployeeLeaveCalendar />,
  "/employee/leaves/history":  <EmployeeLeaveHistory />,
  // Documents
  "/employee/documents/company":        <EmployeeCompanyDocuments />,
  "/employee/documents/my-files":       <EmployeeMyFiles />,
  "/employee/documents/payslips":       <EmployeePayslips />,
  "/employee/documents/contracts":      <EmployeeOfferContracts />,
  "/employee/documents/tax":            <EmployeeTaxCompliance />,
  "/employee/documents/upload-request": <EmployeeUploadRequest />,

  // Travel
  "/employee/travel":           <EmployeeTravelDashboard />,
  "/employee/travel/requests":  <EmployeeTravelRequests />,
  "/employee/travel/approvals": <EmployeeTravelApprovals />,
  "/employee/travel/expenses":  <EmployeeTravelExpenses />,
  "/employee/travel/settings":  <EmployeeTravelSettings />,
};

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  const allPaths = Array.from(new Set([
    ...Object.keys(routeOverrides),
    ...flatRoutes.map(r => r.href).filter(Boolean)
  ]));

  const flatRouteMap = new Map(flatRoutes.map(r => [r.href, r]));

  function getAllowedRolesForPath(path) {
    return Object.keys(ROLE_ALLOWED_PREFIXES).filter((role) => {
      const prefixes = ROLE_ALLOWED_PREFIXES[role] || [];
      return prefixes.some((prefix) => {
        if (prefix === "/") return path === "/";
        return path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : prefix + '/');
      });
    });
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {allPaths.map((path) => {
          let element = routeOverrides[path];
          const routeInfo = flatRouteMap.get(path);
          const label = routeInfo ? routeInfo.label : path.split('/').pop();
          const badge = routeInfo ? routeInfo.badge : null;

          if (!element) {
            element = (
              <PagePlaceholderFallback
                title={label}
                path={path}
                badge={badge}
              />
            );
          }

          const allowedRoles = getAllowedRolesForPath(path);

          return (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute allowedRoles={allowedRoles}>
                  <SuperAdminShell>
                    {element}
                  </SuperAdminShell>
                </ProtectedRoute>
              }
            />
          );
        })}

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}