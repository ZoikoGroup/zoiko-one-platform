import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import SuperAdminShell from "./components/SuperAdminShell";
import { flatRoutes } from "./navigation";
import { AlertTriangle } from "lucide-react";
import { ROLE_ALLOWED_PREFIXES, ROLE_DISALLOWED_PREFIXES } from "./config/roles";

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

function ModuleSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7A00]" />
    </div>
  );
}
import HomePage from "./pages/public/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import RegistrationSuccessPage from "./pages/auth/RegistrationSuccessPage";
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
import ErrorBoundary from "./components/ErrorBoundary";
import { billingAdminRoutePaths, BillingAdminRoutes } from "./modules/billing-admin/routes/BillingAdminRoutes";

// Target 'HrDashBoard.jsx' directly
import ZoikoHRModule from "./modules/zoiko-hr/HrDashBoard.jsx";

// Sub-module imports — lazy-loaded for code splitting
const ZoikoHRLeaveDashboard = lazy(() => import("./modules/zoiko-hr/leave/dashboard.jsx"));
const ZoikoHRLeaveRequests = lazy(() => import("./modules/zoiko-hr/leave/leave-requests.jsx"));
const ZoikoHRLeaveCalendar = lazy(() => import("./modules/zoiko-hr/leave/leave-calendar.jsx"));
const ZoikoHRLeaveReports = lazy(() => import("./modules/zoiko-hr/leave/reports.jsx"));

const ZoikoHRDepartmentsDashboard = lazy(() => import("./modules/zoiko-hr/departments/dashboard.jsx"));
const ZoikoHRDepartmentsDepartmentList = lazy(() => import("./modules/zoiko-hr/departments/department-list.jsx"));
const ZoikoHRDepartmentsDepartmentStructure = lazy(() => import("./modules/zoiko-hr/departments/department-structure.jsx"));
const ZoikoHRDepartmentsReports = lazy(() => import("./modules/zoiko-hr/departments/reports.jsx"));
const ZoikoHRDepartmentsSettings = lazy(() => import("./modules/zoiko-hr/departments/settings.jsx"));

const ZoikoHRDesignationsDashboard = lazy(() => import("./modules/zoiko-hr/designations/dashboard.jsx"));
const ZoikoHRDesignationList = lazy(() => import("./modules/zoiko-hr/designations/designation-list.jsx"));
const ZoikoHRDesignationStructure = lazy(() => import("./modules/zoiko-hr/designations/designation-structure.jsx"));
const ZoikoHRDesignationReports = lazy(() => import("./modules/zoiko-hr/designations/reports.jsx"));
const ZoikoHRDesignationSettings = lazy(() => import("./modules/zoiko-hr/designations/settings.jsx"));

const PerformanceDashboard = lazy(() => import("./modules/zoiko-hr/performance/dashboard.jsx"));
const GoalsOKRs = lazy(() => import("./modules/zoiko-hr/performance/goals.jsx"));
const PerformanceReviews = lazy(() => import("./modules/zoiko-hr/performance/reviews.jsx"));
const Appraisals = lazy(() => import("./modules/zoiko-hr/performance/appraisals.jsx"));
const PerformanceAnalytics = lazy(() => import("./modules/zoiko-hr/performance/analytics.jsx"));
const RecruitmentDashboard = lazy(() => import("./modules/zoiko-hr/recruitment/dashboard.jsx"));
const JobRequisitions = lazy(() => import("./modules/zoiko-hr/recruitment/job-requisitions.jsx"));
const Candidates = lazy(() => import("./modules/zoiko-hr/recruitment/candidates.jsx"));
const Interviews = lazy(() => import("./modules/zoiko-hr/recruitment/interviews.jsx"));
const OfferManagement = lazy(() => import("./modules/zoiko-hr/recruitment/offers.jsx"));
const ZoikoHROnboardingDashboard = lazy(() => import("./modules/zoiko-hr/onboarding/dashboard.jsx"));
const ZoikoHROnboardingNewHires = lazy(() => import("./modules/zoiko-hr/onboarding/new-hires.jsx"));
const ZoikoHROnboardingPreOnboarding = lazy(() => import("./modules/zoiko-hr/onboarding/pre-onboarding.jsx"));
const ZoikoHROnboardingDocuments = lazy(() => import("./modules/zoiko-hr/onboarding/documents.jsx"));
const ZoikoHROnboardingChecklists = lazy(() => import("./modules/zoiko-hr/onboarding/checklists.jsx"));
const ZoikoHROnboardingOrientation = lazy(() => import("./modules/zoiko-hr/onboarding/orientation.jsx"));
const ZoikoHROnboardingReports = lazy(() => import("./modules/zoiko-hr/onboarding/reports.jsx"));
const ZoikoHROnboardingSettings = lazy(() => import("./modules/zoiko-hr/onboarding/settings.jsx"));
const ZoikoHRLearning = lazy(() => import("./modules/zoiko-hr/learning/learning.jsx"));

const EssDashboard = lazy(() => import("./modules/zoiko-hr/ess/dashboard.jsx"));
const EssProfile = lazy(() => import("./modules/zoiko-hr/ess/profile.jsx"));
const EssLeaveManagement = lazy(() => import("./modules/zoiko-hr/ess/leave-management.jsx"));
const EssAttendance = lazy(() => import("./modules/zoiko-hr/ess/attendance.jsx"));
const EssMyDocuments = lazy(() => import("./modules/zoiko-hr/ess/my-documents.jsx"));
const EssAssignedDocuments = lazy(() => import("./modules/zoiko-hr/ess/assigned-documents.jsx"));
const EssRequests = lazy(() => import("./modules/zoiko-hr/ess/requests.jsx"));
const EssSettings = lazy(() => import("./modules/zoiko-hr/ess/settings.jsx"));

const TravelDashboard = lazy(() => import("./modules/zoiko-hr/travel/dashboard.jsx"));
const TravelRequests = lazy(() => import("./modules/zoiko-hr/travel/travel-requests.jsx"));
const TravelApprovals = lazy(() => import("./modules/zoiko-hr/travel/approvals.jsx"));
const TravelExpenses = lazy(() => import("./modules/zoiko-hr/travel/expenses.jsx"));
const TravelSettings = lazy(() => import("./modules/zoiko-hr/travel/settings.jsx"));

// Assets — lazy-load individual components (named exports, can't use barrel lazy)
const AssetsDashboard = lazy(() => import("./modules/zoiko-hr/assets/assetsdashboard"));
const MyAssets = lazy(() => import("./modules/zoiko-hr/assets/my-assets"));
const AssetCatalog = lazy(() => import("./modules/zoiko-hr/assets/inventory"));
const AssetRequests = lazy(() => import("./modules/zoiko-hr/assets/returns"));
const AssetMaintenance = lazy(() => import("./modules/zoiko-hr/assets/maintenance"));
const AssetReports = lazy(() => import("./modules/zoiko-hr/assets/reports"));
const AssetSettings = lazy(() => import("./modules/zoiko-hr/assets/settings"));

const DocumentsDashboard = lazy(() => import("./modules/zoiko-hr/documents/dashboard.jsx"));
const EmployeeDocuments = lazy(() => import("./modules/zoiko-hr/documents/employee-documents.jsx"));
const CompanyDocuments = lazy(() => import("./modules/zoiko-hr/documents/company-documents.jsx"));
const ApprovalWorkflow = lazy(() => import("./modules/zoiko-hr/documents/approvals.jsx"));

const ZoikoHRAttendanceDashboard = lazy(() => import("./modules/zoiko-hr/attendance/dashboard.jsx"));
const ZoikoHRAttendanceDailyRecords = lazy(() => import("./modules/zoiko-hr/attendance/daily-records.jsx"));
const ZoikoHRAttendanceLeaves = lazy(() => import("./modules/zoiko-hr/attendance/leave-management.jsx"));
const ZoikoHRAttendanceShifts = lazy(() => import("./modules/zoiko-hr/attendance/shifts.jsx"));
const ZoikoHRAttendanceHolidays = lazy(() => import("./modules/zoiko-hr/attendance/holidays.jsx"));
const ZoikoHRAttendanceAnalytics = lazy(() => import("./modules/zoiko-hr/attendance/analytics.jsx"));

const WorkforceDashboard = lazy(() => import("./modules/zoiko-hr/workforce-planning/dashboard.jsx"));
const WorkforcePlans = lazy(() => import("./modules/zoiko-hr/workforce-planning/plans.jsx"));
const HeadcountPlanning = lazy(() => import("./modules/zoiko-hr/workforce-planning/headcount.jsx"));
const Succession = lazy(() => import("./modules/zoiko-hr/workforce-planning/succession.jsx"));
const WorkforceReports = lazy(() => import("./modules/zoiko-hr/workforce-planning/reports.jsx"));

const ZoikoHRCompDashboard = lazy(() => import("./modules/zoiko-hr/compensation/dashboard.jsx"));
const ZoikoHRCompSalaryStructures = lazy(() => import("./modules/zoiko-hr/compensation/salary-structures.jsx"));
const ZoikoHRCompPayGrades = lazy(() => import("./modules/zoiko-hr/compensation/pay-grades.jsx"));
const ZoikoHRCompSalaryComponents = lazy(() => import("./modules/zoiko-hr/compensation/salary-components.jsx"));
const ZoikoHRCompBands = lazy(() => import("./modules/zoiko-hr/compensation/compensation-bands.jsx"));
const ZoikoHRCompRevisions = lazy(() => import("./modules/zoiko-hr/compensation/salary-revisions.jsx"));
const ZoikoHRCompAllowances = lazy(() => import("./modules/zoiko-hr/compensation/allowances.jsx"));
const ZoikoHRCompBenefits = lazy(() => import("./modules/zoiko-hr/compensation/benefits.jsx"));

const ZoikoHRDashboard = lazy(() => import("./pages/Peoples/Employees/EmployeeManagement/dashboard.jsx"));
const ZoikoHREmployees = lazy(() => import("./pages/Peoples/Employees/EmployeeManagement/employees.jsx"));
const ZoikoHRProfile = lazy(() => import("./pages/Peoples/Employees/EmployeeManagement/profile.jsx"));
const ZoikoHROrgChart = lazy(() => import("./pages/Peoples/Employees/EmployeeManagement/organization.jsx"));
const ZoikoHRLifecycle = lazy(() => import("./pages/Peoples/Employees/EmployeeManagement/lifecycle.jsx"));
const ZoikoHRReports = lazy(() => import("./pages/Peoples/Employees/EmployeeManagement/reports.jsx"));

const ZoikoTimeModule = lazy(() => import("./modules/zoikotime"));
const ZoikoPayrollModule = lazy(() => import("./modules/payroll"));

const ZoikoSpendModule = lazy(() => import("./modules/spend").then(m => ({ default: m.ZoikoSpendModule })));
const PurchaseRequestsPage = lazy(() => import("./modules/spend").then(m => ({ default: m.PurchaseRequestsPage })));
const PosPage = lazy(() => import("./modules/spend").then(m => ({ default: m.PosPage })));
const VendorsPage = lazy(() => import("./modules/spend").then(m => ({ default: m.VendorsPage })));
const SupplierInvoicesPage = lazy(() => import("./modules/spend").then(m => ({ default: m.SupplierInvoicesPage })));
const ApWorkflowPage = lazy(() => import("./modules/spend").then(m => ({ default: m.ApWorkflowPage })));
const SpendPolicyPage = lazy(() => import("./modules/spend").then(m => ({ default: m.SpendPolicyPage })));
const SpendApprovalsPage = lazy(() => import("./modules/spend").then(m => ({ default: m.SpendApprovalsPage })));
const PaymentPreparationPage = lazy(() => import("./modules/spend").then(m => ({ default: m.PaymentPreparationPage })));
// Billing module — direct lazy imports for per-page code splitting
const BillingDashboardWrapper = lazy(() => import("./modules/billing-admin/dashboard/BillingDashboardWrapper"));
const OrgWorkspaceDashboard = lazy(() => import("./modules/billing-admin/workspace/OrganizationDashboard"));
const OrgWorkspaceProfile = lazy(() => import("./modules/billing-admin/workspace/OrganizationProfile"));
const OrgWorkspaceSubscription = lazy(() => import("./modules/billing-admin/workspace/BillingSubscription"));
const OrgWorkspaceActivity = lazy(() => import("./modules/billing-admin/workspace/ActivityTimeline"));
const OrgWorkspaceNotifications = lazy(() => import("./modules/billing-admin/workspace/Notifications"));
const OrgWorkspaceHelp = lazy(() => import("./modules/billing-admin/workspace/HelpAndDocumentation"));
const ReportsPage = lazy(() => import("./modules/billing/dashboard/reports"));
const BillingSettingsPage = lazy(() => import("./modules/billing/dashboard/settings"));
const ForecastReport = lazy(() => import("./modules/billing/dashboard/forecast-report"));
const CustomerDashboardPage = lazy(() => import("./modules/billing/customers/customer-dashboard"));
const CustomerListPage = lazy(() => import("./modules/billing/customers/customer-list"));
const CustomerProfilePage = lazy(() => import("./modules/billing/customers/customer-profile"));
const CustomerBillingHistoryPage = lazy(() => import("./modules/billing/customers/billing-history"));
const CustomerReportsPage = lazy(() => import("./modules/billing/customers/reports"));
const CustomerSettingsPage = lazy(() => import("./modules/billing/customers/settings"));
const CustomerProfitabilityReport = lazy(() => import("./modules/billing/customers/profitability-report"));
const ProductDashboardPage = lazy(() => import("./modules/billing/products/dashboard"));
const ProductListPage = lazy(() => import("./modules/billing/products/product-list"));
const ProductProfilePage = lazy(() => import("./modules/billing/products/product-profile"));
const ProductCategoriesPage = lazy(() => import("./modules/billing/products/categories"));
const UsageBillingPage = lazy(() => import("./modules/billing/products/usage-billing"));
const ProductPricingPlansPage = lazy(() => import("./modules/billing/products/pricing-plans"));
const ProductReportsPage = lazy(() => import("./modules/billing/products/reports"));
const ProductSettingsPage = lazy(() => import("./modules/billing/products/settings"));
const PricingDashboardPage = lazy(() => import("./modules/billing/pricing/dashboard"));
const PricingPlansPage = lazy(() => import("./modules/billing/pricing/pricing-plans"));
const TierManagementPage = lazy(() => import("./modules/billing/pricing/tier-management"));
const PricingReportsPage = lazy(() => import("./modules/billing/pricing/reports"));
const PricingSettingsPage = lazy(() => import("./modules/billing/pricing/settings"));
const PriceListsPage = lazy(() => import("./modules/billing/pricing/price-lists"));
const PricingRulesPage = lazy(() => import("./modules/billing/pricing/pricing-rules"));
const DiscountEnginePage = lazy(() => import("./modules/billing/pricing/discount-engine"));
const CurrencyPricingPage = lazy(() => import("./modules/billing/pricing/currency-pricing"));
const TaxPricingPage = lazy(() => import("./modules/billing/pricing/tax-pricing"));
const QuotationListPage = lazy(() => import("./modules/billing/quotations/quotation-list"));
const QuotationDashboardPage = lazy(() => import("./modules/billing/quotations/dashboard"));
const QuotationDetailPage = lazy(() => import("./modules/billing/quotations/quotation-detail"));
const QuotationReportsPage = lazy(() => import("./modules/billing/quotations/reports"));
const QuotationSettingsPage = lazy(() => import("./modules/billing/quotations/settings"));
const QuotationWizardPage = lazy(() => import("./modules/billing/quotations/quotation-create"));
const ContractListPage = lazy(() => import("./modules/billing/contracts/contract-list"));
const ContractDashboardPage = lazy(() => import("./modules/billing/contracts/dashboard"));
const ContractDetailPage = lazy(() => import("./modules/billing/contracts/contract-detail"));
const ContractReportsPage = lazy(() => import("./modules/billing/contracts/reports"));
const ContractSettingsPage = lazy(() => import("./modules/billing/contracts/settings"));
const ContractCreateWizardPage = lazy(() => import("./modules/billing/contracts/contract-create"));
const ContractEditPage = lazy(() => import("./modules/billing/contracts/contract-edit"));
const RetainersPage = lazy(() => import("./modules/billing/contracts/retainers"));
const BillingSubscriptionsPage = lazy(() => import("./modules/billing/subscriptions/subscription-list"));
const SubscriptionDashboardPage = lazy(() => import("./modules/billing/subscriptions/dashboard"));
const BillingSubscriptionDetailPage = lazy(() => import("./modules/billing/subscriptions/subscription-detail"));
const CreateSubscriptionWizardPage = lazy(() => import("./modules/billing/subscriptions/subscription-create"));
const SubscriptionReportsPage = lazy(() => import("./modules/billing/subscriptions/reports"));
const SubscriptionSettingsPage = lazy(() => import("./modules/billing/subscriptions/settings"));
const InvoiceSchedulesPage = lazy(() => import("./modules/billing/subscriptions/invoice-schedules"));
const InvoicingPage = lazy(() => import("./modules/billing/invoicing/invoice-list"));
const InvoiceDashboardPage = lazy(() => import("./modules/billing/invoicing/invoice-dashboard"));
const CreateInvoiceWizardPage = lazy(() => import("./modules/billing/invoicing/create-invoice-wizard"));
const InvoiceDetailPage = lazy(() => import("./modules/billing/invoicing/invoice-detail"));
const CreditNotesPage = lazy(() => import("./modules/billing/invoicing/credit-notes"));
const CreditNoteDashboardPage = lazy(() => import("./modules/billing/invoicing/credit-note-dashboard"));
const CreditNoteDetailPage = lazy(() => import("./modules/billing/invoicing/credit-note-detail"));
const InvoiceReportsPage = lazy(() => import("./modules/billing/invoicing/reports"));
const InvoiceSettingsPage = lazy(() => import("./modules/billing/invoicing/settings"));
const MoneyInPage = lazy(() => import("./modules/billing/payments/payment-list"));
const PaymentDashboardPage = lazy(() => import("./modules/billing/payments/payment-dashboard"));
const PaymentDetailPage = lazy(() => import("./modules/billing/payments/payment-detail"));
const CollectionsReceivablesPage = lazy(() => import("./modules/billing/payments/collections-receivables"));
const CollectionsCaseDetailPage = lazy(() => import("./modules/billing/payments/collections-case-detail"));
const CollectionsDashboardPage = lazy(() => import("./modules/billing/payments/collections-dashboard"));
const DunningPage = lazy(() => import("./modules/billing/payments/dunning"));
const DunningCaseDetailPage = lazy(() => import("./modules/billing/payments/dunning-case-detail"));
const DunningLevelsPage = lazy(() => import("./modules/billing/payments/dunning-levels"));
const PromiseToPayPage = lazy(() => import("./modules/billing/payments/promise-to-pay"));
const CreditsPage = lazy(() => import("./modules/billing/payments/credits"));
const RefundsPage = lazy(() => import("./modules/billing/payments/refunds"));
const RefundDashboardPage = lazy(() => import("./modules/billing/payments/refund-dashboard"));
const RefundDetailPage = lazy(() => import("./modules/billing/payments/refund-detail"));
const WriteOffsPage = lazy(() => import("./modules/billing/payments/write-offs"));
const WriteOffDashboardPage = lazy(() => import("./modules/billing/payments/write-off-dashboard"));
const WriteOffDetailPage = lazy(() => import("./modules/billing/payments/write-off-detail"));
const PaymentReportsPage = lazy(() => import("./modules/billing/payments/reports"));
const PaymentSettingsPage = lazy(() => import("./modules/billing/payments/settings"));
const TaxPage = lazy(() => import("./modules/billing/tax/tax-rates"));
const TaxDashboardPage = lazy(() => import("./modules/billing/tax/dashboard"));
const TaxConfigurationPage = lazy(() => import("./modules/billing/tax/tax-configuration"));
const TaxReportsPage = lazy(() => import("./modules/billing/tax/reports"));
const TaxSettingsPage = lazy(() => import("./modules/billing/tax/settings"));
const ComplyDashboard = lazy(() => import("./modules/comply/dashboard"));
const ComplyPolicies = lazy(() => import("./modules/comply/policies"));
const ComplyAudits = lazy(() => import("./modules/comply/audits"));
const ComplyIncidents = lazy(() => import("./modules/comply/incidents"));
const ComplyCertifications = lazy(() => import("./modules/comply/certifications"));
const ComplyComplianceMonitoring = lazy(() => import("./modules/comply/compliance-monitoring"));
const ComplyReports = lazy(() => import("./modules/comply/reports"));
const ComplySettings = lazy(() => import("./modules/comply/settings"));
const ComplyRiskManagement = lazy(() => import("./modules/comply/risk-management"));
const ComplyControls = lazy(() => import("./modules/comply/controls"));
const ComplyTraining = lazy(() => import("./modules/comply/compliance-training"));
const InsightsDashboard = lazy(() => import("./modules/insights/dashboard.jsx"));
const WorkforceInsights = lazy(() => import("./modules/insights/workforce-insights.jsx"));
const PayrollInsights = lazy(() => import("./modules/insights/payroll-insights.jsx"));
const Analytics = lazy(() => import("./modules/insights/analytics.jsx"));
const Reports = lazy(() => import("./modules/insights/reports.jsx"));
const AttendanceInsights = lazy(() => import("./modules/insights/attendance-insights.jsx"));
const PerformanceInsights = lazy(() => import("./modules/insights/performance-insights.jsx"));
const RecruitmentInsights = lazy(() => import("./modules/insights/recruitment-insights.jsx"));
const InsightsSettings = lazy(() => import("./modules/insights/settings.jsx"));
const ItemsPage = lazy(() => import("./modules/inventory/pages/ItemsPage"));
const InventoryModule = lazy(() => import("./modules/inventory/index.jsx"));

const OrgAdminDashboardPage = lazy(() => import("./modules/organization-admin/DashboardPage"));
const OrgAdminOrganizationPage = lazy(() => import("./modules/organization-admin/OrganizationPage"));
const OrgAdminAssetRequestsPage = lazy(() => import("./modules/organization-admin/AssetRequestsPage"));
const OrgAdminAssetsPage = lazy(() => import("./modules/organization-admin/AssetsPage"));
const OrgAdminEmployeeDocumentsPage = lazy(() => import("./modules/organization-admin/EmployeeDocumentsPage"));
const OrgAdminUserManagementPage = lazy(() => import("./modules/organization-admin/UserManagementPage"));
const OrgAdminMetricsPage = lazy(() => import("./modules/organization-admin/MetricsPage"));

const HrAdminDashboardPage = lazy(() => import("./modules/hr-admin/DashboardPage"));
const HrAdminOrganizationPage = lazy(() => import("./modules/hr-admin/OrganizationPage"));

const RolesPage = lazy(() => import("./modules/governance/RolesPage"));

const SuperAdminDashboardPage = lazy(() => import("./modules/super-admin/DashboardPage"));
const SuperAdminOrganizationsPage = lazy(() => import("./modules/super-admin/OrganizationsPage"));
const SuperAdminProductsPage = lazy(() => import("./modules/super-admin/ProductsPage"));
const SuperAdminSubscriptionsPage = lazy(() => import("./modules/super-admin/SubscriptionsPage"));
const SuperAdminUserManagementPage = lazy(() => import("./modules/super-admin/UserManagementPage"));
const SuperAdminAnalyticsPage = lazy(() => import("./modules/super-admin/AnalyticsPage"));
const SuperAdminAuditLogsPage = lazy(() => import("./modules/super-admin/AuditLogsPage"));
const SuperAdminSystemHealthPage = lazy(() => import("./modules/super-admin/SystemHealthPage"));
const SuperAdminPlatformSettingsPage = lazy(() => import("./modules/super-admin/PlatformSettingsPage"));
const NotificationCenter = lazy(() => import("./modules/super-admin/NotificationCenter"));
const SecurityCenter = lazy(() => import("./modules/super-admin/SecurityCenter"));
const SupportCenter = lazy(() => import("./modules/super-admin/SupportCenter"));
const PendingOrganizationsPage = lazy(() => import("./modules/super-admin/PendingOrganizationsPage"));
const OrganizationDetailPage = lazy(() => import("./modules/super-admin/OrganizationDetailPage"));
const SecurityPage = lazy(() => import("./modules/governance/SecurityPage"));
const AuditPage = lazy(() => import("./modules/governance/AuditPage"));
const CompliancePage = lazy(() => import("./modules/governance/CompliancePage"));

const DashboardPage = lazy(() => import("./modules/platform/DashboardPage"));
const OrganizationsPage = lazy(() => import("./modules/platform/OrganizationsPage"));
const SubscriptionsPage = lazy(() => import("./modules/platform/SubscriptionsPage"));

const AdminProfilePage = lazy(() => import("./modules/operations/AdminProfilePage"));
const IntegrationsPage = lazy(() => import("./modules/operations/IntegrationsPage"));
const ApiManagementPage = lazy(() => import("./modules/operations/ApiManagementPage"));
const FeatureFlagsPage = lazy(() => import("./modules/operations/FeatureFlagsPage"));
const NotificationsPage = lazy(() => import("./modules/operations/NotificationsPage"));
const SystemMonitoringPage = lazy(() => import("./modules/operations/SystemMonitoringPage"));
const SupportCenterPage = lazy(() => import("./modules/operations/SupportCenterPage"));

const ZoikoIdPage = lazy(() => import("./modules/shared-layers/ZoikoIdPage"));
const ZoikoWorkflowPage = lazy(() => import("./modules/shared-layers/ZoikoWorkflowPage"));
const ZoikoHubPage = lazy(() => import("./modules/shared-layers/ZoikoHubPage"));
const ZoikoConnectPageModule = lazy(() => import("./modules/shared-layers/ZoikoConnectPage"));
const DocumentsPage = lazy(() => import("./modules/shared-layers/DocumentsPage"));
const ApprovalsPage = lazy(() => import("./modules/shared-layers/ApprovalsPage"));
const ExpensesPage = lazy(() => import("./modules/shared-layers/ExpensesPage"));
const AiAssistancePage = lazy(() => import("./modules/shared-layers/AiAssistancePage"));
const UserManagementPage = lazy(() => import("./modules/settings/UserManagementPage"));

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE WORKSPACE — src/pages/Peoples/Employees/
// Filenames use capital E prefix: Employee_ (except EmployeeProfile.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// Profile folder
const EmployeeProfilePage = lazy(() => import("./pages/Peoples/Employees/Profile/EmployeeProfile.jsx"));
const EmployeeBankDetails = lazy(() => import("./pages/Peoples/Employees/Profile/Employee_BankDetails.jsx"));
const EmployeeAssetDetails = lazy(() => import("./pages/Peoples/Employees/Profile/Employee_AssetDetails.jsx"));
const EmployeeEmergencyContacts = lazy(() => import("./pages/Peoples/Employees/Profile/Employee_EmergencyContacts.jsx"));
const EmployeeSecuritySettings = lazy(() => import("./pages/Peoples/Employees/Profile/Employee_settings.jsx"));

// ESS folder
const EmployeeEssDashboard = lazy(() => import("./pages/Peoples/Employees/ESS/Employee_EssDashboard.jsx"));
const EmployeeEssAttendance = lazy(() => import("./pages/Peoples/Employees/ESS/Employee_EssAttendance.jsx"));
const EmployeeEssRequests = lazy(() => import("./pages/Peoples/Employees/ESS/EmployeeLearning.jsx"));
const EmployeeEssSettings = lazy(() => import("./pages/Peoples/Employees/ESS/Employee_EssSettings.jsx"));

// Leaves folder
const EmployeeMyLeave = lazy(() => import("./pages/Peoples/Employees/Leaves/Employee_ApplyLeave.jsx"));
const EmployeeApplyLeave = lazy(() => import("./pages/Peoples/Employees/Leaves/Employee_ApplyLeaveForm.jsx"));
const EmployeeLeaveCalendar = lazy(() => import("./pages/Peoples/Employees/Leaves/Employee_LeaveCalendar.jsx"));
const EmployeeLeaveHistory = lazy(() => import("./pages/Peoples/Employees/Leaves/Employee_LeaveHistory.jsx"));
// Documents folder
const EmployeeMyFiles = lazy(() => import("./pages/Peoples/Employees/Documents/Employee_MyFiles.jsx"));
const EmployeePayslips = lazy(() => import("./pages/Peoples/Employees/Documents/Employee_Payslips.jsx"));
const EmployeeOfferContracts = lazy(() => import("./pages/Peoples/Employees/Documents/Employee_OfferContracts.jsx"));
const EmployeeTaxCompliance = lazy(() => import("./pages/Peoples/Employees/Documents/Employee_TaxCompliance.jsx"));
const EmployeeUploadRequest = lazy(() => import("./pages/Peoples/Employees/Documents/Employee_UploadRequest.jsx"));
const EmployeeCompanyDocuments = lazy(() => import("./pages/Peoples/Employees/Documents/Employee_CompanyDocuments.jsx"));

// Travel folder
const EmployeeTravelDashboard = lazy(() => import("./pages/Peoples/Employees/Travel/Employee_TravelDashboard.jsx"));
const EmployeeTravelRequests = lazy(() => import("./pages/Peoples/Employees/Travel/Employee_TravelRequests.jsx"));
const EmployeeTravelApprovals = lazy(() => import("./pages/Peoples/Employees/Travel/Employee_TravelApprovals.jsx"));
const EmployeeTravelExpenses = lazy(() => import("./pages/Peoples/Employees/Travel/Employee_TravelExpenses.jsx"));
const EmployeeTravelSettings = lazy(() => import("./pages/Peoples/Employees/Travel/Employee_TravelSettings.jsx"));

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
  "/payroll/policy":      <ZoikoPayrollModule />,
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
  "/billing": <BillingDashboardWrapper />,
  "/billing/workspace/dashboard": <OrgWorkspaceDashboard />,
  "/billing/workspace/organization": <OrgWorkspaceProfile />,
  "/billing/workspace/subscription": <OrgWorkspaceSubscription />,
  "/billing/workspace/activity": <OrgWorkspaceActivity />,
  "/billing/workspace/notifications": <OrgWorkspaceNotifications />,
  "/billing/workspace/help": <OrgWorkspaceHelp />,
  "/billing/customers": <CustomerListPage />,
  "/billing/customers/dashboard": <CustomerDashboardPage />,
  "/billing/customers/:id": <CustomerProfilePage />,
  "/billing/customers/billing-history": <CustomerBillingHistoryPage />,
  "/billing/customers/reports": <CustomerReportsPage />,
  "/billing/customers/profitability": <CustomerProfitabilityReport />,
  "/billing/customers/settings": <CustomerSettingsPage />,
  "/billing/products": <ProductListPage />,
  "/billing/products/:id": <ProductProfilePage />,
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
  "/billing/pricing/price-lists": <PriceListsPage />,
  "/billing/pricing/pricing-rules": <PricingRulesPage />,
  "/billing/pricing/discounts": <DiscountEnginePage />,
  "/billing/pricing/currency-pricing": <CurrencyPricingPage />,
  "/billing/pricing/tax-pricing": <TaxPricingPage />,
  "/billing/quotations": <QuotationListPage />,
  "/billing/quotations/dashboard": <QuotationDashboardPage />,
  "/billing/quotations/create": <QuotationWizardPage />,
  "/billing/quotations/settings": <QuotationSettingsPage />,
  "/billing/quotations/reports": <QuotationReportsPage />,
  "/billing/quotations/:id": <QuotationDetailPage />,
  "/billing/contracts": <ContractListPage />,
  "/billing/contracts/dashboard": <ContractDashboardPage />,
  "/billing/contracts/create": <ContractCreateWizardPage />,
  "/billing/contracts/settings": <ContractSettingsPage />,
  "/billing/contracts/reports": <ContractReportsPage />,
  "/billing/contracts/:id/edit": <ContractEditPage />,
  "/billing/contracts/:id": <ContractDetailPage />,
  "/billing/subscriptions": <BillingSubscriptionsPage />,
  "/billing/subscriptions/dashboard": <SubscriptionDashboardPage />,
  "/billing/subscriptions/create": <CreateSubscriptionWizardPage />,
  "/billing/subscriptions/settings": <SubscriptionSettingsPage />,
  "/billing/subscriptions/reports": <SubscriptionReportsPage />,
  "/billing/subscriptions/:id": <BillingSubscriptionDetailPage />,
  "/billing/invoices": <InvoicingPage />,
  "/billing/invoices/dashboard": <InvoiceDashboardPage />,
  "/billing/invoices/create": <CreateInvoiceWizardPage />,
  "/billing/invoices/:id": <InvoiceDetailPage />,
  "/billing/invoices/settings": <InvoiceSettingsPage />,
  "/billing/invoice-schedules": <InvoiceSchedulesPage />,
  "/billing/usage-billing": <UsageBillingPage />,
  "/billing/tax": <TaxPage />,
  "/billing/tax/dashboard": <TaxDashboardPage />,
  "/billing/tax/configuration": <TaxConfigurationPage />,
  "/billing/tax/reports": <TaxReportsPage />,
  "/billing/tax/settings": <TaxSettingsPage />,
  "/billing/collections-receivables": <CollectionsReceivablesPage />,
  "/billing/collections/dashboard": <CollectionsDashboardPage />,
  "/billing/collections/:id": <CollectionsCaseDetailPage />,
  "/billing/promise-to-pay": <PromiseToPayPage />,
  "/billing/credit-notes": <CreditNotesPage />,
  "/billing/credit-notes/dashboard": <CreditNoteDashboardPage />,
  "/billing/credit-notes/:id": <CreditNoteDetailPage />,
  "/billing/dunning": <DunningPage />,
  "/billing/dunning/levels": <DunningLevelsPage />,
  "/billing/dunning/:id": <DunningCaseDetailPage />,
  "/billing/reports": <ReportsPage />,
  "/billing/reports/forecast": <ForecastReport />,
  "/billing/settings": <BillingSettingsPage />,
  "/billing/payments": <MoneyInPage />,
  "/billing/payments/dashboard": <PaymentDashboardPage />,
  "/billing/payments/:id": <PaymentDetailPage />,
  "/billing/credits": <CreditsPage />,
  "/billing/refunds": <RefundsPage />,
  "/billing/refunds/dashboard": <RefundDashboardPage />,
  "/billing/refunds/:id": <RefundDetailPage />,
  "/billing/write-offs": <WriteOffsPage />,
  "/billing/write-offs/dashboard": <WriteOffDashboardPage />,
  "/billing/write-offs/:id": <WriteOffDetailPage />,
  "/billing/retainers": <RetainersPage />,
  "/billing/invoicing/reports": <InvoiceReportsPage />,
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
  "/organization-admin/users": <OrgAdminUserManagementPage />,
  "/organization-admin/metrics": <OrgAdminMetricsPage />,
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
  "/super-admin/users": <SuperAdminUserManagementPage />,
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
  const routePath = (href) => href ? href.split(/[?#]/)[0] : href;
  const allPaths = Array.from(new Set([
    ...Object.keys(routeOverrides),
    ...flatRoutes.map(r => routePath(r.href)).filter(Boolean)
  ]));

  const flatRouteMap = new Map(flatRoutes.map(r => [routePath(r.href), r]));

  function getAllowedRolesForPath(path) {
    return Object.keys(ROLE_ALLOWED_PREFIXES).filter((role) => {
      const disallowed = ROLE_DISALLOWED_PREFIXES[role] || [];
      if (disallowed.some((prefix) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : prefix + '/'))) {
        return false;
      }
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
      <Suspense fallback={<ModuleSpinner />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/success" element={<RegistrationSuccessPage />} />
        
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
                <ErrorBoundary>
                  <ProtectedRoute allowedRoles={allowedRoles}>
                    {billingAdminRoutePaths.has(path) ? (
                      <BillingAdminRoutes>
                        {element}
                      </BillingAdminRoutes>
                    ) : (
                      <SuperAdminShell>
                        {element}
                      </SuperAdminShell>
                    )}
                  </ProtectedRoute>
                </ErrorBoundary>
              }
            />
          );
        })}

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}
