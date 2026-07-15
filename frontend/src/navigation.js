import {
  Activity,
  AlertTriangle,
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
CircleDollarSign,
  ClipboardCheck,
  DollarSign,
  Download,
  RefreshCw,
  ClipboardList,
  Clock,
  CreditCard,
  FileCheck2,
  FileText,
  GitBranch,
  Globe,
  GraduationCap,
  HeartHandshake,
  History,
  LayoutDashboard,
  Layers,
  Lock,
  MapPin,
  MessageSquare,
  MinusCircle,
  Network,
  Package,
  Percent,
  Phone,
  Plane,
  PlayCircle,
  PlusCircle,
  Receipt,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Target,
  TrendingUp,
  Undo2,
  User,
  UserCheck,
  UserCircle,
  UserPlus,
  Users,
  WalletCards,
  Workflow,
  Save,
  UserRoundCheck,
  ThumbsUp,
  Wrench,
  Settings,
  Server,
  Database,
  HardDrive,
  FileText as FileTextIcon,
  Globe as GlobeIcon,
  FolderOpen,
  FileSignature,
  UploadCloud,
  Landmark,
  Laptop,
  ListFilter,
  Plus,
} from "lucide-react";

// Shared Layers – first‑class section
const sharedLayers = {
  title: "SHARED LAYERS",
  items: [
    { label: "API Gateway", href: "/shared/api-gateway", icon: Network },
    { label: "Common UI Kit", href: "/shared/ui-kit", icon: Layers },
  ],
};

// Platform core commands
const platform = {
  title: "PLATFORM",
  items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Organizations", href: "/organizations", icon: ShieldCheck, badge: "3" },
  ],
};

// Super Admin / Platform Owner
const superAdmin = {
  title: "SUPER ADMIN",
  items: [
    {
      label: "Platform Owner",
      href: "/admin-profile",
      icon: User,
      dp: true,
    },
  ],
};

// Super Admin Dashboard Section
const superAdminDashboard = {
  title: "SUPER ADMIN",
  items: [
    { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
    { label: "Organizations", href: "/super-admin/organizations", icon: Building2 },
    { label: "Approvals", href: "/super-admin/approvals", icon: ThumbsUp },
    // { label: "Products", href: "/super-admin/products", icon: Package },
    { label: "Subscriptions", href: "/super-admin/subscriptions", icon: CreditCard },
    { label: "Platform Users", href: "/super-admin/users", icon: Users },
    { label: "Analytics", href: "/super-admin/analytics", icon: TrendingUp },
    { label: "Audit Logs", href: "/super-admin/audit-logs", icon: FileTextIcon },
    { label: "System Health", href: "/super-admin/system-health", icon: Server },
    { label: "Platform Settings", href: "/super-admin/settings", icon: Settings },
    { label: "Notification Center", href: "/super-admin/notifications", icon: Bell },
    { label: "Security Center", href: "/super-admin/security-events", icon: Shield },
    { label: "Support Center", href: "/super-admin/support-tickets", icon: MessageSquare },
  ],
};
// Products (including Zoiko HR and other products)
const products = {
  title: "PRODUCTS",
  items: [
    {
      label: "Products",
      icon: Package,
      children: [
        {
          label: "Zoiko HR",
          icon: Users,
          badge: "HR",
          children: [
            { label: "Dashboard",          href: "/zoiko-hr",                    icon: LayoutDashboard },
            { label: "Documents",          icon: FileText, children: [
              { label: "Dashboard",            href: "/zoiko-hr/documents",                    icon: LayoutDashboard },
              { label: "Employee Documents",   href: "/zoiko-hr/documents/employee-upload",     icon: UploadCloud },
              { label: "Company Documents",    href: "/zoiko-hr/documents/company-documents",   icon: Building2 },
              { label: "Approval Workflow",    href: "/zoiko-hr/documents/approvals",           icon: ClipboardCheck },
            ]},
            { label: "Departments",        icon: Building2, children: [
              { label: "Dashboard",            href: "/zoiko-hr/departments",             icon: LayoutDashboard },
              { label: "Department List",      href: "/zoiko-hr/departments/list",        icon: Building2 },
              { label: "Structure",            href: "/zoiko-hr/departments/structure",    icon: GitBranch },
              { label: "Reports",              href: "/zoiko-hr/departments/reports",      icon: FileText },
              { label: "Settings",             href: "/zoiko-hr/departments/settings",     icon: SlidersHorizontal },
            ]},
            { label: "Designations",       icon: BadgeCheck, children: [
              { label: "Dashboard",            href: "/zoiko-hr/designations",             icon: LayoutDashboard },
              { label: "Designation List",     href: "/zoiko-hr/designations/list",        icon: BadgeCheck },
              { label: "Level Matrix",         href: "/zoiko-hr/designations/levels",       icon: Layers },
              { label: "Reports",              href: "/zoiko-hr/designations/reports",      icon: FileText },
              { label: "Settings",             href: "/zoiko-hr/designations/settings",     icon: SlidersHorizontal },
            ]},
            { label: "Leave",              icon: Calendar, children: [
              { label: "Dashboard",            href: "/zoiko-hr/leave",                    icon: LayoutDashboard },
              { label: "Leave Requests",       href: "/zoiko-hr/leave/requests",            icon: ClipboardCheck },
              { label: "Calendar",             href: "/zoiko-hr/leave/calendar",            icon: Calendar },
              { label: "Reports",              href: "/zoiko-hr/leave/reports",             icon: FileText },
            ]},
            { label: "Attendance", icon: Clock, children: [
              { label: "Dashboard",              href: "/zoiko-hr/attendance",             icon: LayoutDashboard },
              { label: "Attendance Records",     href: "/zoiko-hr/attendance/daily",       icon: ClipboardList },
              { label: "Holiday Calendar",       href: "/zoiko-hr/attendance/holidays",     icon: CalendarDays },
              { label: "Attendance Analytics",   href: "/zoiko-hr/attendance/analytics",    icon: BarChart3 },
            ]},
            { label: "Performance",        icon: Activity, children: [
              { label: "Dashboard",             href: "/zoiko-hr/performance",              icon: LayoutDashboard },
              { label: "Goals & OKRs",          href: "/zoiko-hr/performance/goals",        icon: Target },
              { label: "Performance Reviews",   href: "/zoiko-hr/performance/reviews",      icon: ClipboardCheck },
              { label: "Appraisals",            href: "/zoiko-hr/performance/appraisals",   icon: Award },
              { label: "Performance Analytics", href: "/zoiko-hr/performance/analytics",    icon: BarChart3 },
            ]},
            { label: "Recruitment",        icon: UserPlus, children: [
              { label: "Dashboard",              href: "/zoiko-hr/recruitment",              icon: LayoutDashboard },
              { label: "Job Requisitions",       href: "/zoiko-hr/recruitment/job-requisitions", icon: Briefcase },
              { label: "Candidates",             href: "/zoiko-hr/recruitment/candidates",    icon: Users },
              { label: "Interviews",             href: "/zoiko-hr/recruitment/interviews",    icon: Calendar },
              { label: "Offer Management",       href: "/zoiko-hr/recruitment/offers",        icon: FileCheck2 },
            ]},
            { label: "Onboarding",         icon: UserCheck, children: [
              { label: "Dashboard",             href: "/zoiko-hr/onboarding",               icon: LayoutDashboard },
              { label: "New Hires",             href: "/zoiko-hr/onboarding/new-hires",      icon: UserPlus },
              { label: "Pre-Onboarding",        href: "/zoiko-hr/onboarding/pre-onboarding", icon: CalendarCheck },
              { label: "Documents",             href: "/zoiko-hr/onboarding/documents",       icon: FileText },
              { label: "Checklists",            href: "/zoiko-hr/onboarding/checklists",     icon: ClipboardCheck },
              { label: "Orientation",           href: "/zoiko-hr/onboarding/orientation",     icon: Calendar },
              { label: "Reports",               href: "/zoiko-hr/onboarding/reports",         icon: BarChart3 },
              { label: "Settings",              href: "/zoiko-hr/onboarding/settings",        icon: SlidersHorizontal },
            ]},
            { label: "Employee Management", icon: Users, children: [
              { label: "Dashboard",             href: "/zoiko-hr/employee-management",         icon: LayoutDashboard },
              { label: "Employees",             href: "/zoiko-hr/employee-management/employees", icon: Users },
              { label: "Organization",           href: "/zoiko-hr/employee-management/organization", icon: GitBranch },
              { label: "Lifecycle",              href: "/zoiko-hr/employee-management/lifecycle", icon: Clock },
              { label: "Reports",               href: "/zoiko-hr/employee-management/reports", icon: BarChart3 },
            ]},
            { label: "Assets",             icon: Package, children: [
              { label: "Assets",             href: "/organization-admin/assets",          icon: Package },
              { label: "Asset Requests",     href: "/organization-admin/assets/requests", icon: ClipboardList },
            ]},
            { label: "Learning",           icon: BookOpen, children: [
              { label: "Dashboard",          href: "/zoiko-hr/learning",               icon: LayoutDashboard },
              { label: "Courses",            href: "/zoiko-hr/learning/courses",        icon: BookOpen },
              { label: "Training Programs",  href: "/zoiko-hr/learning/training-programs", icon: GraduationCap },
              { label: "Assessments",        href: "/zoiko-hr/learning/assessments",    icon: ClipboardCheck },
              { label: "Reports",            href: "/zoiko-hr/learning/reports",        icon: FileText },
            ]},
            { label: "Compensation",       icon: CircleDollarSign, children: [
              { label: "Dashboard",          href: "/zoiko-hr/compensation",               icon: LayoutDashboard },
              { label: "Salary Structures",  href: "/zoiko-hr/compensation/salary-structures", icon: CircleDollarSign },
              { label: "Pay Grades",         href: "/zoiko-hr/compensation/pay-grades",     icon: BadgeCheck },
              { label: "Salary Components",  href: "/zoiko-hr/compensation/salary-components", icon: Layers },
              { label: "Compensation Bands", href: "/zoiko-hr/compensation/bands",          icon: BarChart3 },
              { label: "Salary Revisions",   href: "/zoiko-hr/compensation/revisions",      icon: History },
              { label: "Allowances",         href: "/zoiko-hr/compensation/allowances",     icon: WalletCards },
              { label: "Benefits",           href: "/zoiko-hr/compensation/benefits",       icon: HeartHandshake },
            ]},
            { label: "ESS",                icon: User, children: [
              { label: "Dashboard",          href: "/zoiko-hr/ess",                   icon: LayoutDashboard },
              { label: "Profile",            href: "/zoiko-hr/ess/profile",           icon: User },
              { label: "Leave Management",   href: "/zoiko-hr/ess/leave",             icon: Calendar },
              { label: "Attendance",         href: "/zoiko-hr/ess/attendance",        icon: Clock },
              { label: "My Documents",       href: "/zoiko-hr/ess/my-documents",      icon: FileText },
              { label: "Learning",           href: "/zoiko-hr/ess/requests",          icon: BookOpen },
              { label: "Settings",           href: "/zoiko-hr/ess/settings",          icon: SlidersHorizontal },
            ]},
            { label: "Employee Documents", icon: FolderOpen, children: [
              { label: "My Files",           href: "/zoiko-hr/ess/documents/my-files",        icon: FolderOpen },
              { label: "Payslips",           href: "/zoiko-hr/ess/documents/payslips",        icon: Receipt },
              { label: "Offer & Contracts",  href: "/zoiko-hr/ess/documents/contracts",       icon: FileSignature },
              { label: "Tax & Compliance",   href: "/zoiko-hr/ess/documents/tax",             icon: ShieldCheck },
              { label: "Upload Request",     href: "/zoiko-hr/ess/documents/upload-request",  icon: UploadCloud },
            ]},
            { label: "Travel",             icon: Plane, children: [
              { label: "Dashboard",          href: "/zoiko-hr/travel",                icon: LayoutDashboard },
              { label: "Travel Requests",    href: "/zoiko-hr/travel/requests",       icon: Plane },
              { label: "Approvals",          href: "/zoiko-hr/travel/approvals",      icon: ClipboardCheck },
              { label: "Expenses",           href: "/zoiko-hr/travel/expenses",       icon: Receipt },
              { label: "Settings",           href: "/zoiko-hr/travel/settings",       icon: SlidersHorizontal },
            ]},
            { label: "Workforce Planning", icon: Target, children: [
              { label: "Dashboard",             href: "/zoiko-hr/workforce-planning",       icon: LayoutDashboard },
              { label: "Plans",                 href: "/zoiko-hr/workforce-planning/plans",  icon: Target },
              { label: "Headcount",             href: "/zoiko-hr/workforce-planning/headcount", icon: Users },
              { label: "Succession",            href: "/zoiko-hr/workforce-planning/succession", icon: UserCheck },
              { label: "Reports",               href: "/zoiko-hr/workforce-planning/reports", icon: FileText },
            ]},
          ],
        },
        { label: "ZoikoTime", href: "/zoikotime", icon: ShieldCheck, badge: "Time" },
        {
          label: "Zoiko Payroll",
          icon: WalletCards,
          badge: "Payroll",
          children: [
            { label: "Dashboard", href: "/payroll", icon: LayoutDashboard },
            { label: "Compliances", href: "/payroll/compliances", icon: ShieldCheck },
            { label: "Employees", href: "/payroll/employees", icon: Users },
            { label: "Attendance", href: "/payroll/attendance", icon: CalendarCheck },
            { label: "Leaves", href: "/payroll/leaves", icon: BookOpen },
            { label: "Payroll Runs", href: "/payroll/payroll-runs", icon: PlayCircle },
            { label: "Payslips", href: "/payroll/payslips", icon: FileText },
            { label: "Reports", href: "/payroll/reports", icon: BarChart3 },
          ],
        },
{
          label: "Zoiko Billing",
          icon: CreditCard,
          badge: "Billing",
          children: [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              children: [
                { label: "Dashboard", href: "/billing", icon: LayoutDashboard },
                { label: "Reports", href: "/billing/reports", icon: FileText },
                { label: "Settings", href: "/billing/settings", icon: SlidersHorizontal },
              ],
            },
            {
              label: "Customers",
              icon: Users,
              children: [
                { label: "Dashboard", href: "/billing/customers/dashboard", icon: LayoutDashboard },
                { label: "Customer List", href: "/billing/customers", icon: Users },
                { label: "Billing History", href: "/billing/customers/billing-history", icon: History },
                { label: "Reports", href: "/billing/customers/reports", icon: FileText },
                { label: "Settings", href: "/billing/customers/settings", icon: SlidersHorizontal },
              ],
            },
            {
              label: "Products",
              icon: Package,
              children: [
                { label: "Dashboard", href: "/billing/products/dashboard", icon: LayoutDashboard },
                { label: "Product List", href: "/billing/products", icon: Package },
                { label: "Categories", href: "/billing/products/categories", icon: Tags },
                { label: "Usage Billing", href: "/billing/usage-billing", icon: TrendingUp },
                { label: "Pricing Plans", href: "/billing/products/pricing-plans", icon: CreditCard },
                { label: "Reports", href: "/billing/products/reports", icon: FileText },
                { label: "Settings", href: "/billing/products/settings", icon: SlidersHorizontal },
              ],
            },
            {
              label: "Pricing",
              icon: Tags,
              children: [
                { label: "Dashboard", href: "/billing/pricing/dashboard", icon: LayoutDashboard },
                { label: "Price Lists", href: "/billing/pricing/price-lists", icon: Tags },
                { label: "Pricing Plans", href: "/billing/pricing", icon: CreditCard },
                { label: "Tier Management", href: "/billing/pricing/tier-management", icon: Layers },
                { label: "Pricing Rules", href: "/billing/pricing/pricing-rules", icon: ListFilter },
                { label: "Discount Engine", href: "/billing/pricing/discounts", icon: Percent },
                { label: "Currency Pricing", href: "/billing/pricing/currency-pricing", icon: DollarSign },
                { label: "Tax Pricing", href: "/billing/pricing/tax-pricing", icon: Landmark },
                { label: "Reports", href: "/billing/pricing/reports", icon: FileText },
                { label: "Settings", href: "/billing/pricing/settings", icon: SlidersHorizontal },
              ],
            },
            {
              label: "Quotations",
              icon: FileText,
              children: [
                { label: "Quotation List", href: "/billing/quotations", icon: FileText },
                { label: "Reports", href: "/billing/quotations/reports", icon: FileText },
                { label: "Settings", href: "/billing/quotations/settings", icon: SlidersHorizontal },
              ],
            },
            {
              label: "Contracts",
              icon: FileSignature,
              children: [
                { label: "Contract List", href: "/billing/contracts", icon: FileSignature },
                { label: "Retainers", href: "/billing/retainers", icon: CircleDollarSign },
                { label: "Reports", href: "/billing/contracts/reports", icon: FileText },
                { label: "Settings", href: "/billing/contracts/settings", icon: SlidersHorizontal },
              ],
            },
            {
              label: "Subscriptions",
              icon: UserCheck,
              children: [
                { label: "Subscription List", href: "/billing/subscriptions", icon: UserCheck },
                { label: "Reports", href: "/billing/subscriptions/reports", icon: FileText },
                { label: "Settings", href: "/billing/subscriptions/settings", icon: SlidersHorizontal },
              ],
            },
            {
              label: "Invoicing",
              icon: CreditCard,
              children: [
                { label: "Invoice Dashboard", href: "/billing/invoices/dashboard", icon: LayoutDashboard },
                { label: "Create Invoice", href: "/billing/invoices/create", icon: Plus },
                { label: "Invoice List", href: "/billing/invoices", icon: CreditCard },
                { label: "Invoice Schedule", href: "/billing/invoice-schedules", icon: Calendar },
                { label: "Credit Notes", href: "/billing/credit-notes", icon: ClipboardCheck },
                { label: "Reports", href: "/billing/invoicing/reports", icon: FileText },
                { label: "Settings", href: "/billing/invoicing/settings", icon: SlidersHorizontal },
              ],
            },
            {
              label: "Payments",
              icon: Receipt,
              children: [
                { label: "Payment List", href: "/billing/payments", icon: Receipt },
                { label: "Receivables", href: "/billing/receivables", icon: Landmark },
                { label: "Collections", href: "/billing/collections", icon: WalletCards },
                { label: "Collections & Receivables", href: "/billing/collections-receivables", icon: WalletCards },
                { label: "Credits", href: "/billing/credits", icon: CircleDollarSign },
                { label: "Dunning", href: "/billing/dunning", icon: ClipboardList },
                { label: "Reports", href: "/billing/payments/reports", icon: FileText },
                { label: "Settings", href: "/billing/payments/settings", icon: SlidersHorizontal },
              ],
            },
            {
              label: "Tax",
              icon: CircleDollarSign,
              children: [
                { label: "Tax Rates", href: "/billing/tax", icon: CircleDollarSign },
                { label: "Tax Configuration", href: "/billing/tax/configuration", icon: Settings },
                { label: "Reports", href: "/billing/tax/reports", icon: FileText },
                { label: "Settings", href: "/billing/tax/settings", icon: SlidersHorizontal },
              ],
            },
          ],
        },
        {
          label: "Zoiko Spend",
          icon: WalletCards,
          badge: "Spend",
          children: [
            { label: "Purchase Requests",   href: "/spend/purchase-requests",   icon: ClipboardList },
            { label: "Purchase Orders",     href: "/spend/purchase-orders",     icon: FileText },
            { label: "Vendors",             href: "/spend/vendors",             icon: Building2 },
            { label: "Supplier Invoices",   href: "/spend/supplier-invoices",   icon: Receipt },
            { label: "AP Workflow",         href: "/spend/ap-workflow",         icon: Workflow },
            { label: "Spend Policy",        href: "/spend/spend-policy",        icon: FileCheck2 },
            { label: "Approvals",           href: "/spend/approvals",           icon: ClipboardCheck },
            { label: "Payment Preparation", href: "/spend/payment-preparation", icon: CreditCard },
          ],
        },
        { label: "Zoiko Projects", href: "/projects", icon: Layers, badge: "Projects" },
        {
          label: "Zoiko Inventory",
          icon: Package,
          badge: "Inventory",
          children: [
            { label: "Items", href: "/inventory/items", icon: Layers },
            { label: "Locations", href: "/inventory/locations", icon: MapPin },
            { label: "Stock", href: "/inventory/stock", icon: Package },
            { label: "Receiving", href: "/inventory/receiving", icon: Download },
            { label: "Goods Issue", href: "/inventory/goods-issue", icon: Send },
            { label: "Transfers", href: "/inventory/transfers", icon: GitBranch },
            { label: "Stock Counts", href: "/inventory/stock-counts", icon: ClipboardList },
            { label: "Reorder", href: "/inventory/reorder", icon: RefreshCw },
            { label: "Assets", href: "/inventory/assets", icon: Package },
            { label: "Reports", href: "/inventory/reports", icon: FileText },
          ],
        },
        {
          label: "Zoiko Comply",
          icon: FileCheck2,
          badge: "Comply",
          children: [
            { label: "Dashboard & Reports", href: "/comply", icon: LayoutDashboard },
            { label: "Policy Library", href: "/comply/policies", icon: FileCheck2 },
            { label: "Tracking & Audits", href: "/comply/audits", icon: Search },
            { label: "Violations & Actions", href: "/comply/incidents", icon: Activity },
            { label: "Risks & Settings", href: "/comply/settings", icon: SlidersHorizontal },
          ],
        },
        {
          label: "Zoiko Insights",
          icon: Sparkles,
          badge: "Insights",
          children: [
            { label: "Dashboard", href: "/insights", icon: LayoutDashboard },
            { label: "Workforce Analytics", href: "/insights/workforce", icon: Users },
            { label: "Payroll Analytics", href: "/insights/payroll", icon: CircleDollarSign },
            { label: "Analytics", href: "/insights/analytics", icon: TrendingUp },
            { label: "Attendance Insights", href: "/insights/attendance", icon: Clock },
            { label: "Performance Insights", href: "/insights/performance", icon: Activity },
            { label: "Recruitment Insights", href: "/insights/recruitment", icon: UserPlus },
            { label: "Reports", href: "/insights/reports", icon: FileText },
            { label: "Settings", href: "/insights/settings", icon: SlidersHorizontal },
          ],
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE WORKSPACE
// Shown only to employees (filtered via ROLE_ALLOWED_PREFIXES in roles.js).
// Covers the 5 subfolders under src/pages/Peoples/Employees/
// ─────────────────────────────────────────────────────────────────────────────
const employeeWorkspace = {
  title: "MY WORKSPACE",
  items: [
    // ── Profile ────────────────────────────────────────────────────────────
    {
      label: "Profile",
      icon: UserCircle,
      children: [
        { label: "My Profile",          href: "/employee/profile",                    icon: UserCircle },
        { label: "Bank Details",        href: "/employee/profile/bank-details",       icon: Landmark },
        { label: "Asset Details",       href: "/employee/profile/assets",             icon: Laptop },
        { label: "Emergency Contacts",  href: "/employee/profile/emergency-contacts", icon: ShieldAlert },
        { label: "Security Settings",   href: "/employee/profile/settings",           icon: Lock },
      ],
    },

    // ── ESS ────────────────────────────────────────────────────────────────
    {
      label: "ESS",
      icon: LayoutDashboard,
      children: [
        { label: "Dashboard",   href: "/employee/ess",            icon: LayoutDashboard },
        { label: "Attendance",  href: "/employee/ess/attendance", icon: Clock },
        { label: "Learning",    href: "/employee/ess/requests",   icon: BookOpen },
        { label: "Settings",    href: "/employee/ess/settings",   icon: SlidersHorizontal },
      ],
    },

    // ── Leaves ─────────────────────────────────────────────────────────────
    {
      label: "Leaves",
      icon: Calendar,
      children: [
        { label: "My Leave",        href: "/employee/leaves",          icon: CalendarCheck },
        { label: "Apply Leave",     href: "/employee/leaves/apply",    icon: Plus },
        { label: "Leave Calendar",  href: "/employee/leaves/calendar", icon: CalendarDays },
        { label: "Leave History",   href: "/employee/leaves/history",  icon: History },
      ],
    },

    // ── Documents ──────────────────────────────────────────────────────────
    {
      label: "Documents",
      icon: FolderOpen,
      children: [
        { label: "Company Documents", href: "/employee/documents/company",        icon: FileText },
        { label: "My Files",          href: "/employee/documents/my-files",       icon: FolderOpen },
        { label: "Payslips",          href: "/employee/documents/payslips",        icon: Receipt },
        { label: "Offer & Contracts", href: "/employee/documents/contracts",       icon: FileSignature },
        { label: "Tax & Compliance",  href: "/employee/documents/tax",             icon: ShieldCheck },
        { label: "Upload Request",    href: "/employee/documents/upload-request",  icon: UploadCloud },
      ],
    },

    // ── Travel ─────────────────────────────────────────────────────────────
    {
      label: "Travel",
      icon: Plane,
      children: [
        { label: "Dashboard",        href: "/employee/travel",           icon: LayoutDashboard },
        { label: "Travel Requests",  href: "/employee/travel/requests",  icon: Plane },
        { label: "Approvals",        href: "/employee/travel/approvals", icon: ClipboardCheck },
        { label: "Expenses",         href: "/employee/travel/expenses",  icon: Receipt },
        { label: "Settings",         href: "/employee/travel/settings",  icon: SlidersHorizontal },
      ],
    },

  ],
};

// Infrastructure
const infrastructure = {
  title: "INFRASTRUCTURE",
  items: [
    { label: "ZoikoPay", href: "/zoikopay", icon: CreditCard },
    { label: "ZoikoCoreX", href: "/zoikocorex", icon: Network },
  ],
};

// Platform Operations
const platformOperations = {
  title: "PLATFORM OPERATIONS",
  items: [
    {
      label: "Platform Operations",
      icon: Wrench,
      children: [
        { label: "Integrations", href: "/operations/integrations", icon: Globe },
        { label: "API Management", href: "/operations/api-management", icon: Network },
        { label: "Feature Flags", href: "/operations/feature-flags", icon: SlidersHorizontal },
        { label: "Notifications", href: "/operations/notifications", icon: Bell },
        { label: "System Monitoring", href: "/operations/system-monitoring", icon: Activity },
        { label: "Support Center", href: "/operations/support-center", icon: MessageSquare },
      ],
    },
  ],
};
// Platform Governance – directly after Platform
const platformGovernance = {
  title: "PLATFORM GOVERNANCE",
  items: [
    {
      label: "Platform Governance",
      icon: Shield,
      children: [
        { label: "User and Roles", href: "/roles", icon: Users, badge: "9" },
        { label: "Security Center", href: "/security-center", icon: ShieldCheck, badge: "1" },
        { label: "Trust Center", href: "/trust-center", icon: Sparkles },
        { label: "Audit Center", href: "/audit-center", icon: FileText },
        { label: "Compliance Center", href: "/compliance-center", icon: ClipboardCheck },
      ],
    },
  ],
};

// Administration
const settings = {
  title: "ADMINISTRATION",
  items: [
    { label: "User Management", href: "/settings/user-management", icon: Users },
  ],
};

// Shared Layers collapsible section
const sharedLayersSection = {
  title: "SHARED LAYERS",
  items: [
    {
      label: "Shared Layers",
      icon: Layers,
      children: [
        { label: "Zoiko ID", href: "/shared/id", icon: User },
        { label: "Zoiko Workflow", href: "/shared/workflow", icon: Workflow },
        { label: "Zoiko Hub", href: "/shared/hub", icon: Layers },
        { label: "Zoiko Connect", href: "/shared/connect", icon: Globe },
        { label: "Documents", href: "/shared/documents", icon: FileText },
        { label: "Approvals", href: "/shared/approvals", icon: FileCheck2 },
        { label: "Expenses", href: "/shared/expenses", icon: WalletCards },
        { label: "AI Assistance", href: "/shared/ai-assistance", icon: Sparkles },
      ],
    },
  ],
};

// HR Admin Dashboard Section
const hrAdminDashboard = {
  title: "HR ADMIN",
  items: [
    { label: "Dashboard", href: "/hr-admin/dashboard", icon: LayoutDashboard },
    { label: "My Organization", href: "/hr-admin/my-organization", icon: Building2 },
  ],
};

// Organization Admin Dashboard Section
const organizationAdminDashboard = {
  title: "ORGANIZATION ADMIN",
  items: [
    { label: "Dashboard", href: "/organization-admin/dashboard", icon: LayoutDashboard },
    { label: "My Organization", href: "/organization-admin/organization", icon: Building2 },
  ],
};

export const sections = [
  superAdminDashboard,
  organizationAdminDashboard,
  hrAdminDashboard,
  superAdmin,
  platformGovernance,
  products,
  // Employee-only workspace section (filtered to role=employee by useFilteredNavigation)
  employeeWorkspace,
  sharedLayersSection,
  settings,
  infrastructure,
  platformOperations,
];

function flattenItems(items) {
  return items.flatMap((item) => {
    const current = item.href ? [{ label: item.label, href: item.href, badge: item.badge }] : [];
    const children = item.children ? flattenItems(item.children) : [];
    return [...current, ...children];
  });
}

export const flatRoutes = flattenItems(sections.flatMap((section) => section.items));
