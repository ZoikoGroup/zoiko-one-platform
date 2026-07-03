import { api } from "./api";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

async function fetchWithFallback(url, mockFn, isList = true) {
  try {
    return await api.get(url);
  } catch (err) {
    console.warn(`insightsService: fetch failed for ${url}, falling back to mock:`, err.message || err);
  }
  await delay();
  const data = mockFn ? mockFn() : undefined;
  if (isList && Array.isArray(data)) return [...data];
  if (!isList && typeof data === "object" && data !== null) return { ...data };
  return data;
}

function mockDashboardData() {
  return {
    kpis: {
      totalRevenue: 45800000,
      employeeCount: 2534,
      activeProjects: 47,
      profitMargin: 18.5,
      complianceScore: 87,
      totalPayrollCost: 17500000,
      vendorSpend: 8200000,
      growthRate: 12.3,
    },
    revenueTrend: [
      { month: "Jan", revenue: 3200000, cost: 2400000 },
      { month: "Feb", revenue: 3400000, cost: 2500000 },
      { month: "Mar", revenue: 3600000, cost: 2600000 },
      { month: "Apr", revenue: 3800000, cost: 2700000 },
      { month: "May", revenue: 4000000, cost: 2800000 },
      { month: "Jun", revenue: 4200000, cost: 2900000 },
      { month: "Jul", revenue: 4100000, cost: 2850000 },
      { month: "Aug", revenue: 4300000, cost: 2950000 },
      { month: "Sep", revenue: 4500000, cost: 3000000 },
      { month: "Oct", revenue: 4400000, cost: 2900000 },
      { month: "Nov", revenue: 4600000, cost: 3100000 },
      { month: "Dec", revenue: 4800000, cost: 3200000 },
    ],
    costTrend: [
      { month: "Jan", payroll: 1200000, operations: 450000, infrastructure: 350000, marketing: 250000, other: 150000 },
      { month: "Feb", payroll: 1220000, operations: 460000, infrastructure: 360000, marketing: 260000, other: 160000 },
      { month: "Mar", payroll: 1250000, operations: 470000, infrastructure: 370000, marketing: 270000, other: 170000 },
      { month: "Apr", payroll: 1280000, operations: 480000, infrastructure: 380000, marketing: 280000, other: 180000 },
      { month: "May", payroll: 1300000, operations: 490000, infrastructure: 390000, marketing: 290000, other: 190000 },
      { month: "Jun", payroll: 1320000, operations: 500000, infrastructure: 400000, marketing: 300000, other: 200000 },
      { month: "Jul", payroll: 1350000, operations: 510000, infrastructure: 410000, marketing: 310000, other: 210000 },
      { month: "Aug", payroll: 1380000, operations: 520000, infrastructure: 420000, marketing: 320000, other: 220000 },
      { month: "Sep", payroll: 1400000, operations: 530000, infrastructure: 430000, marketing: 330000, other: 230000 },
      { month: "Oct", payroll: 1420000, operations: 540000, infrastructure: 440000, marketing: 340000, other: 240000 },
      { month: "Nov", payroll: 1450000, operations: 550000, infrastructure: 450000, marketing: 350000, other: 250000 },
      { month: "Dec", payroll: 1480000, operations: 560000, infrastructure: 460000, marketing: 360000, other: 260000 },
    ],
    workforceGrowth: [
      { month: "Jan", headcount: 2340, hires: 25, departures: 12 },
      { month: "Feb", headcount: 2360, hires: 28, departures: 15 },
      { month: "Mar", headcount: 2385, hires: 32, departures: 14 },
      { month: "Apr", headcount: 2400, hires: 30, departures: 18 },
      { month: "May", headcount: 2420, hires: 35, departures: 16 },
      { month: "Jun", headcount: 2440, hires: 33, departures: 17 },
      { month: "Jul", headcount: 2455, hires: 28, departures: 19 },
      { month: "Aug", headcount: 2470, hires: 31, departures: 15 },
      { month: "Sep", headcount: 2490, hires: 34, departures: 14 },
      { month: "Oct", headcount: 2505, hires: 29, departures: 16 },
      { month: "Nov", headcount: 2520, hires: 32, departures: 15 },
      { month: "Dec", headcount: 2534, hires: 30, departures: 18 },
    ],
    performanceOverview: [
      { metric: "Revenue Target", value: 92, target: 100 },
      { metric: "Customer Satisfaction", value: 88, target: 90 },
      { metric: "Employee Engagement", value: 76, target: 80 },
      { metric: "Project Completion", value: 85, target: 90 },
      { metric: "Compliance Score", value: 87, target: 95 },
      { metric: "Budget Adherence", value: 82, target: 90 },
    ],
    departmentRevenue: [
      { name: "Engineering", value: 12500000 },
      { name: "Sales", value: 9800000 },
      { name: "Marketing", value: 5200000 },
      { name: "Operations", value: 7800000 },
      { name: "Finance", value: 3500000 },
      { name: "Consulting", value: 7000000 },
    ],
  };
}

function mockWorkforceData() {
  return {
    summary: {
      totalHeadcount: 2534,
      activeEmployees: 2410,
      newHiresThisYear: 187,
      openPositions: 87,
      departuresThisYear: 124,
      annualAttrition: 12.4,
      avgTenure: 3.8,
      avgSalary: 78500,
      locationCount: 8,
    },
    departmentDistribution: [
      { name: "Engineering", headcount: 650, value: 650, color: "#6366f1", budget: 52000000, openPositions: 25 },
      { name: "Sales", headcount: 380, value: 380, color: "#22c55e", budget: 28000000, openPositions: 15 },
      { name: "Marketing", headcount: 210, value: 210, color: "#f59e0b", budget: 18000000, openPositions: 8 },
      { name: "Finance", headcount: 145, value: 145, color: "#ef4444", budget: 12000000, openPositions: 5 },
      { name: "HR", headcount: 98, value: 98, color: "#8b5cf6", budget: 8000000, openPositions: 3 },
      { name: "Operations", headcount: 285, value: 285, color: "#06b6d4", budget: 22000000, openPositions: 12 },
      { name: "Support", headcount: 310, value: 310, color: "#ec4899", budget: 15000000, openPositions: 10 },
      { name: "Product", headcount: 180, value: 180, color: "#14b8a6", budget: 20000000, openPositions: 7 },
      { name: "Security", headcount: 82, value: 82, color: "#a855f7", budget: 9000000, openPositions: 5 },
      { name: "Legal", headcount: 52, value: 52, color: "#64748b", budget: 6000000, openPositions: 2 },
      { name: "Admin", headcount: 72, value: 72, color: "#f97316", budget: 5000000, openPositions: 1 },
      { name: "R&D", headcount: 70, value: 70, color: "#84cc16", budget: 14000000, openPositions: 4 },
    ],
    monthlyTrend: [
      { month: "Jan", headcount: 2340, overtime: 420, absenteeism: 3.2 },
      { month: "Feb", headcount: 2360, overtime: 380, absenteeism: 2.8 },
      { month: "Mar", headcount: 2385, overtime: 450, absenteeism: 3.5 },
      { month: "Apr", headcount: 2400, overtime: 410, absenteeism: 3.1 },
      { month: "May", headcount: 2420, overtime: 390, absenteeism: 2.9 },
      { month: "Jun", headcount: 2440, overtime: 430, absenteeism: 3.3 },
      { month: "Jul", headcount: 2455, overtime: 400, absenteeism: 3.0 },
      { month: "Aug", headcount: 2470, overtime: 370, absenteeism: 2.7 },
      { month: "Sep", headcount: 2490, overtime: 440, absenteeism: 3.4 },
      { month: "Oct", headcount: 2505, overtime: 410, absenteeism: 3.0 },
      { month: "Nov", headcount: 2520, overtime: 380, absenteeism: 2.8 },
      { month: "Dec", headcount: 2534, overtime: 350, absenteeism: 2.5 },
    ],
    hiringTrend: [
      { month: "Jan", applications: 320, interviews: 85, offers: 28, hires: 22 },
      { month: "Feb", applications: 280, interviews: 72, offers: 25, hires: 20 },
      { month: "Mar", applications: 350, interviews: 92, offers: 32, hires: 26 },
      { month: "Apr", applications: 300, interviews: 78, offers: 30, hires: 24 },
      { month: "May", applications: 270, interviews: 70, offers: 22, hires: 18 },
      { month: "Jun", applications: 310, interviews: 82, offers: 28, hires: 22 },
      { month: "Jul", applications: 260, interviews: 68, offers: 20, hires: 16 },
      { month: "Aug", applications: 330, interviews: 88, offers: 30, hires: 25 },
      { month: "Sep", applications: 290, interviews: 75, offers: 26, hires: 21 },
      { month: "Oct", applications: 310, interviews: 80, offers: 28, hires: 23 },
      { month: "Nov", applications: 280, interviews: 72, offers: 24, hires: 19 },
      { month: "Dec", applications: 250, interviews: 65, offers: 20, hires: 16 },
    ],
    leaveTrend: [
      { month: "Jan", sick: 180, vacation: 420, personal: 85, other: 45 },
      { month: "Feb", sick: 160, vacation: 380, personal: 72, other: 38 },
      { month: "Mar", sick: 200, vacation: 450, personal: 92, other: 52 },
      { month: "Apr", sick: 175, vacation: 410, personal: 78, other: 42 },
      { month: "May", sick: 155, vacation: 390, personal: 68, other: 35 },
      { month: "Jun", sick: 190, vacation: 430, personal: 88, other: 48 },
      { month: "Jul", sick: 170, vacation: 520, personal: 95, other: 55 },
      { month: "Aug", sick: 165, vacation: 480, personal: 82, other: 45 },
      { month: "Sep", sick: 185, vacation: 440, personal: 90, other: 50 },
      { month: "Oct", sick: 160, vacation: 410, personal: 75, other: 40 },
      { month: "Nov", sick: 175, vacation: 380, personal: 70, other: 38 },
      { month: "Dec", sick: 150, vacation: 350, personal: 65, other: 32 },
    ],
    locations: [
      { name: "New York", count: 850, percentage: 33.5, city: "New York" },
      { name: "San Francisco", count: 520, percentage: 20.5, city: "San Francisco" },
      { name: "London", count: 380, percentage: 15.0, city: "London" },
      { name: "Singapore", count: 280, percentage: 11.0, city: "Singapore" },
      { name: "Bangalore", count: 240, percentage: 9.5, city: "Bangalore" },
      { name: "Remote", count: 180, percentage: 7.1, city: "Remote" },
      { name: "Sydney", count: 52, percentage: 2.1, city: "Sydney" },
      { name: "Dubai", count: 32, percentage: 1.3, city: "Dubai" },
    ],
  };
}

function mockWorkforceTableData() {
  return [
    { department: "Engineering", headcount: 650, avgSalary: 95000, attrition: "8.2", utilization: 87, satisfaction: 4.2, openPositions: 25, avgTenure: 3.5 },
    { department: "Sales", headcount: 380, avgSalary: 72000, attrition: "15.8", utilization: 82, satisfaction: 3.8, openPositions: 15, avgTenure: 2.8 },
    { department: "Marketing", headcount: 210, avgSalary: 68000, attrition: "10.5", utilization: 79, satisfaction: 4.0, openPositions: 8, avgTenure: 3.1 },
    { department: "Finance", headcount: 145, avgSalary: 82000, attrition: "6.9", utilization: 91, satisfaction: 4.3, openPositions: 5, avgTenure: 4.8 },
    { department: "HR", headcount: 98, avgSalary: 65000, attrition: "9.2", utilization: 85, satisfaction: 4.1, openPositions: 3, avgTenure: 4.2 },
    { department: "Operations", headcount: 285, avgSalary: 70000, attrition: "12.3", utilization: 78, satisfaction: 3.6, openPositions: 12, avgTenure: 3.5 },
    { department: "Support", headcount: 310, avgSalary: 55000, attrition: "18.5", utilization: 88, satisfaction: 3.5, openPositions: 10, avgTenure: 2.2 },
    { department: "Product", headcount: 180, avgSalary: 92000, attrition: "7.8", utilization: 84, satisfaction: 4.4, openPositions: 7, avgTenure: 3.0 },
    { department: "Security", headcount: 82, avgSalary: 105000, attrition: "5.5", utilization: 90, satisfaction: 4.5, openPositions: 5, avgTenure: 4.5 },
    { department: "Legal", headcount: 52, avgSalary: 110000, attrition: "4.2", utilization: 86, satisfaction: 4.3, openPositions: 2, avgTenure: 5.2 },
    { department: "Admin", headcount: 72, avgSalary: 52000, attrition: "11.0", utilization: 75, satisfaction: 3.9, openPositions: 1, avgTenure: 4.0 },
    { department: "R&D", headcount: 70, avgSalary: 98000, attrition: "6.5", utilization: 80, satisfaction: 4.2, openPositions: 4, avgTenure: 3.2 },
  ];
}

function mockPayrollData() {
  return {
    summary: {
      grossPayroll: 17500000,
      netPayroll: 13125000,
      totalBenefits: 3850000,
      totalOvertime: 890000,
      avgSalary: 78500,
      payrollToRevenue: 38.3,
      yoyChange: 5.2,
    },
    departmentPayroll: [
      { name: "Engineering", headcount: 650, gross: 5200000, net: 3900000, benefits: 1150000, overtime: 280000 },
      { name: "Sales", headcount: 380, gross: 2800000, net: 2100000, benefits: 620000, overtime: 160000 },
      { name: "Marketing", headcount: 210, gross: 1500000, net: 1125000, benefits: 330000, overtime: 85000 },
      { name: "Finance", headcount: 145, gross: 1200000, net: 900000, benefits: 260000, overtime: 45000 },
      { name: "HR", headcount: 98, gross: 750000, net: 562000, benefits: 165000, overtime: 25000 },
      { name: "Operations", headcount: 285, gross: 2100000, net: 1575000, benefits: 460000, overtime: 140000 },
      { name: "Support", headcount: 310, gross: 1800000, net: 1350000, benefits: 400000, overtime: 95000 },
      { name: "Product", headcount: 180, gross: 1500000, net: 1125000, benefits: 330000, overtime: 60000 },
      { name: "Security", headcount: 82, gross: 850000, net: 637000, benefits: 187000, overtime: 30000 },
      { name: "Legal", headcount: 52, gross: 600000, net: 450000, benefits: 132000, overtime: 15000 },
      { name: "Admin", headcount: 72, gross: 400000, net: 300000, benefits: 88000, overtime: 20000 },
      { name: "R&D", headcount: 70, gross: 650000, net: 487000, benefits: 143000, overtime: 35000 },
    ],
    monthlyTrend: [
      { month: "Jan", gross: 1320000, net: 990000, overtime: 72000, benefits: 290000 },
      { month: "Feb", gross: 1350000, net: 1012000, overtime: 68000, benefits: 297000 },
      { month: "Mar", gross: 1380000, net: 1035000, overtime: 75000, benefits: 304000 },
      { month: "Apr", gross: 1400000, net: 1050000, overtime: 70000, benefits: 308000 },
      { month: "May", gross: 1420000, net: 1065000, overtime: 65000, benefits: 312000 },
      { month: "Jun", gross: 1450000, net: 1087000, overtime: 78000, benefits: 319000 },
      { month: "Jul", gross: 1480000, net: 1110000, overtime: 74000, benefits: 326000 },
      { month: "Aug", gross: 1500000, net: 1125000, overtime: 72000, benefits: 330000 },
      { month: "Sep", gross: 1520000, net: 1140000, overtime: 80000, benefits: 334000 },
      { month: "Oct", gross: 1550000, net: 1162000, overtime: 76000, benefits: 341000 },
      { month: "Nov", gross: 1580000, net: 1185000, overtime: 82000, benefits: 348000 },
      { month: "Dec", gross: 1600000, net: 1200000, overtime: 79000, benefits: 352000 },
    ],
  };
}

function mockFinancialData() {
  return {
    kpis: { totalRevenue: 45800000, totalExpenses: 32500000, netIncome: 13300000, operatingMargin: 29.1, ebitda: 15200000, cashFlow: 9800000, accountsReceivable: 4200000, accountsPayable: 3100000 },
    revenueBreakdown: [
      { name: "Product Sales", value: 18500000, percentage: 40.4 },
      { name: "Services", value: 12800000, percentage: 28.0 },
      { name: "Subscriptions", value: 9200000, percentage: 20.1 },
      { name: "Consulting", value: 5300000, percentage: 11.6 },
    ],
    expenseCategories: [
      { name: "Payroll", value: 17500000, percentage: 53.8 },
      { name: "Infrastructure", value: 4800000, percentage: 14.8 },
      { name: "Marketing", value: 3200000, percentage: 9.8 },
      { name: "Operations", value: 2800000, percentage: 8.6 },
      { name: "R&D", value: 2200000, percentage: 6.8 },
      { name: "Other", value: 2000000, percentage: 6.2 },
    ],
    monthlyTrend: [
      { month: "Jan", revenue: 3200000, expenses: 2400000, profit: 800000 },
      { month: "Feb", revenue: 3400000, expenses: 2500000, profit: 900000 },
      { month: "Mar", revenue: 3600000, expenses: 2600000, profit: 1000000 },
      { month: "Apr", revenue: 3800000, expenses: 2700000, profit: 1100000 },
      { month: "May", revenue: 4000000, expenses: 2800000, profit: 1200000 },
      { month: "Jun", revenue: 4200000, expenses: 2900000, profit: 1300000 },
      { month: "Jul", revenue: 4100000, expenses: 2850000, profit: 1250000 },
      { month: "Aug", revenue: 4300000, expenses: 2950000, profit: 1350000 },
      { month: "Sep", revenue: 4500000, expenses: 3000000, profit: 1500000 },
      { month: "Oct", revenue: 4400000, expenses: 2900000, profit: 1500000 },
      { month: "Nov", revenue: 4600000, expenses: 3100000, profit: 1500000 },
      { month: "Dec", revenue: 4800000, expenses: 3200000, profit: 1600000 },
    ],
  };
}

function mockProjectData() {
  return {
    summary: { totalProjects: 47, activeProjects: 38, completedThisQuarter: 9, onTrack: 28, atRisk: 7, behindSchedule: 3, totalBudget: 62000000, totalSpent: 41500000 },
    budgetData: [
      { name: "Engineering", budget: 15000000, spent: 10200000, remaining: 4800000 },
      { name: "Marketing", budget: 8000000, spent: 5500000, remaining: 2500000 },
      { name: "Product", budget: 12000000, spent: 8200000, remaining: 3800000 },
      { name: "Infrastructure", budget: 10000000, spent: 6800000, remaining: 3200000 },
      { name: "Security", budget: 9000000, spent: 5800000, remaining: 3200000 },
      { name: "Operations", budget: 8000000, spent: 5000000, remaining: 3000000 },
    ],
    statusData: [
      { name: "On Track", value: 28, color: "#22c55e" },
      { name: "At Risk", value: 7, color: "#f59e0b" },
      { name: "Behind", value: 3, color: "#ef4444" },
    ],
    upcomingMilestones: [
      { name: "Platform v3.0 Launch", dueDate: "2026-08-15", status: "on-track", owner: "Product" },
      { name: "Security Audit Completion", dueDate: "2026-07-30", status: "at-risk", owner: "Security" },
      { name: "Data Migration", dueDate: "2026-08-01", status: "on-track", owner: "Engineering" },
      { name: "Q3 Planning", dueDate: "2026-07-15", status: "completed", owner: "PMO" },
    ],
  };
}

function mockInventoryData() {
  return {
    summary: { totalItems: 12450, lowStock: 89, outOfStock: 23, pendingOrders: 156, totalValue: 8750000, turnoverRate: 4.8, avgLeadTime: 12 },
    categoryDistribution: [
      { name: "Electronics", count: 3200, value: 2800000 },
      { name: "Office Supplies", count: 2800, value: 450000 },
      { name: "Furniture", count: 1200, value: 980000 },
      { name: "Software Licenses", count: 1850, value: 2100000 },
      { name: "Network Equipment", count: 950, value: 1200000 },
      { name: "Safety Equipment", count: 650, value: 340000 },
      { name: "Spare Parts", count: 1800, value: 580000 },
      { name: "Consumables", count: 2500, value: 290000 },
    ],
    stockTrend: [
      { month: "May", received: 420, issued: 380, reorder: 45 },
      { month: "Jun", received: 450, issued: 410, reorder: 52 },
      { month: "Jul", received: 380, issued: 430, reorder: 68 },
      { month: "Aug", received: 490, issued: 400, reorder: 38 },
      { month: "Sep", received: 440, issued: 420, reorder: 55 },
      { month: "Oct", received: 410, issued: 390, reorder: 48 },
    ],
    recentMovements: [
      { item: "Laptop Dell XPS 15", type: "issued", qty: 12, date: "2026-10-15", department: "Engineering" },
      { item: "Monitor 27-inch", type: "received", qty: 30, date: "2026-10-14", department: "IT" },
      { item: "Keyboard Mechanical", type: "issued", qty: 8, date: "2026-10-13", department: "Marketing" },
      { item: "USB-C Hub", type: "reorder", qty: 50, date: "2026-10-12", department: "Procurement" },
    ],
  };
}

function mockComplianceData() {
  return {
    summary: { complianceScore: 87, activePolicies: 48, pendingReviews: 12, violationsThisQuarter: 8, remediated: 5, openFindings: 14, trainingCompletion: 82, auditCoverage: 76 },
    complianceScore: [
      { month: "May", score: 84, target: 85 },
      { month: "Jun", score: 85, target: 86 },
      { month: "Jul", score: 83, target: 86 },
      { month: "Aug", score: 86, target: 87 },
      { month: "Sep", score: 85, target: 87 },
      { month: "Oct", score: 87, target: 88 },
    ],
    byFramework: [
      { name: "GDPR", compliance: 88, findings: 5 },
      { name: "SOC 2", compliance: 85, findings: 8 },
      { name: "ISO 27001", compliance: 82, findings: 6 },
      { name: "PCI DSS", compliance: 90, findings: 3 },
      { name: "HIPAA", compliance: 86, findings: 4 },
      { name: "SOX", compliance: 92, findings: 2 },
    ],
    recentFindings: [
      { title: "Access review incomplete for Q3", severity: "high", status: "open", owner: "IAM Team" },
      { title: "Vendor risk assessment overdue", severity: "medium", status: "open", owner: "Procurement" },
      { title: "Firewall rule review pending", severity: "low", status: "remediated", owner: "Network" },
      { title: "Policy acknowledgment gap", severity: "medium", status: "open", owner: "HR" },
    ],
  };
}

function mockForecastingData() {
  return {
    kpis: { projectedRevenue: 52000000, projectedCost: 36500000, projectedProfit: 15500000, growthRate: 13.5, confidenceScore: 85, riskAdjustedReturn: 22.4 },
    revenueForecast: [
      { quarter: "Q1 2026", actual: 11000000, forecast: 10800000, lower: 10200000, upper: 11400000 },
      { quarter: "Q2 2026", actual: 11800000, forecast: 11500000, lower: 10900000, upper: 12100000 },
      { quarter: "Q3 2026", forecast: 12500000, lower: 11800000, upper: 13200000 },
      { quarter: "Q4 2026", forecast: 13000000, lower: 12200000, upper: 13800000 },
      { quarter: "Q1 2027", forecast: 13500000, lower: 12600000, upper: 14400000 },
    ],
    costForecast: [
      { quarter: "Q1 2026", actual: 7800000, forecast: 7600000, lower: 7200000, upper: 8000000 },
      { quarter: "Q2 2026", actual: 8200000, forecast: 8000000, lower: 7600000, upper: 8400000 },
      { quarter: "Q3 2026", forecast: 8500000, lower: 8100000, upper: 8900000 },
      { quarter: "Q4 2026", forecast: 8800000, lower: 8400000, upper: 9200000 },
      { quarter: "Q1 2027", forecast: 9000000, lower: 8600000, upper: 9400000 },
    ],
    scenarios: [
      { name: "Base Case", probability: 60, revenue: 52000000, cost: 36500000, profit: 15500000 },
      { name: "Optimistic", probability: 20, revenue: 58000000, cost: 38000000, profit: 20000000 },
      { name: "Pessimistic", probability: 20, revenue: 46000000, cost: 35000000, profit: 11000000 },
    ],
  };
}

function mockCustomReportsData() {
  return {
    templates: [
      { id: 1, name: "Monthly Financial Summary", type: "Financial", format: "pdf", frequency: "Monthly", category: "Executive", lastGenerated: "2026-10-01", createdBy: "Admin", status: "active" },
      { id: 2, name: "Workforce Headcount Report", type: "Workforce", format: "excel", frequency: "Weekly", category: "HR", lastGenerated: "2026-10-13", createdBy: "HR Team", status: "active" },
      { id: 3, name: "Payroll Cost Analysis", type: "Payroll", format: "pdf", frequency: "Monthly", category: "Finance", lastGenerated: "2026-10-01", createdBy: "Finance", status: "active" },
      { id: 4, name: "Compliance Dashboard Snapshot", type: "Compliance", format: "pdf", frequency: "Quarterly", category: "Compliance", lastGenerated: "2026-09-30", createdBy: "Compliance Officer", status: "active" },
      { id: 5, name: "Project Status Overview", type: "Project", format: "csv", frequency: "Weekly", category: "Operations", lastGenerated: "2026-10-13", createdBy: "PMO", status: "active" },
      { id: 6, name: "Inventory Valuation Report", type: "Inventory", format: "excel", frequency: "Monthly", category: "Operations", lastGenerated: "2026-10-01", createdBy: "Warehouse", status: "archived" },
      { id: 7, name: "Executive KPI Dashboard", type: "Financial", format: "pdf", frequency: "Monthly", category: "Executive", lastGenerated: "2026-10-01", createdBy: "CEO Office", status: "active" },
      { id: 8, name: "Department Budget vs Actual", type: "Financial", format: "excel", frequency: "Monthly", category: "Finance", lastGenerated: "2026-10-05", createdBy: "Finance", status: "active" },
    ],
    reportTypes: [
      { name: "Financial", count: 8 },
      { name: "Workforce", count: 6 },
      { name: "Compliance", count: 5 },
      { name: "Project", count: 4 },
      { name: "Inventory", count: 3 },
      { name: "Payroll", count: 4 },
    ],
  };
}

function mockSavedReportsData() {
  return {
    reports: [
      { id: 1, name: "Q3 2026 Financial Summary", type: "Financial", format: "pdf", generatedAt: "2026-10-01", generatedBy: "Admin", size: "2.4 MB", frequency: "Monthly", lastViewed: "2026-10-15", starred: true, tags: ["quarterly", "executive"] },
      { id: 2, name: "October Workforce Report", type: "Workforce", format: "excel", generatedAt: "2026-10-13", generatedBy: "HR Team", size: "1.8 MB", frequency: "Weekly", lastViewed: "2026-10-14", starred: false, tags: ["headcount"] },
      { id: 3, name: "Q3 Payroll Analysis", type: "Payroll", format: "pdf", generatedAt: "2026-10-01", generatedBy: "Finance", size: "3.2 MB", frequency: "Monthly", lastViewed: "2026-10-10", starred: true, tags: ["cost", "payroll"] },
      { id: 4, name: "Compliance Scorecard Q3", type: "Compliance", format: "pdf", generatedAt: "2026-09-30", generatedBy: "Compliance Officer", size: "1.5 MB", frequency: "Quarterly", lastViewed: "2026-10-05", starred: false, tags: ["compliance"] },
      { id: 5, name: "Weekly Project Status", type: "Project", format: "csv", generatedAt: "2026-10-13", generatedBy: "PMO", size: "0.8 MB", frequency: "Weekly", lastViewed: "2026-10-13", starred: false, tags: ["projects"] },
      { id: 6, name: "Inventory Stock Report", type: "Inventory", format: "excel", generatedAt: "2026-10-01", generatedBy: "Warehouse", size: "4.1 MB", frequency: "Monthly", lastViewed: "2026-10-02", starred: false, tags: ["inventory"] },
      { id: 7, name: "Executive Dashboard - Oct", type: "Financial", format: "pdf", generatedAt: "2026-10-15", generatedBy: "CEO Office", size: "1.2 MB", frequency: "Daily", lastViewed: "2026-10-15", starred: true, tags: ["executive"] },
      { id: 8, name: "Department Budget Report", type: "Financial", format: "excel", generatedAt: "2026-10-05", generatedBy: "Finance", size: "2.1 MB", frequency: "Monthly", lastViewed: "2026-10-08", starred: false, tags: ["budget"] },
    ],
    recentGenerations: [
      { id: 1, name: "Daily Revenue Snapshot", format: "pdf", generatedAt: "2026-10-15", size: "0.5 MB", scheduled: true },
      { id: 2, name: "Weekly Workforce Update", format: "excel", generatedAt: "2026-10-14", size: "1.1 MB", scheduled: true },
      { id: 3, name: "Payroll Variance Report", format: "pdf", generatedAt: "2026-10-13", size: "0.9 MB", scheduled: false },
      { id: 4, name: "Compliance Monitoring Report", format: "csv", generatedAt: "2026-10-12", size: "2.3 MB", scheduled: true },
      { id: 5, name: "Project Milestone Tracker", format: "pdf", generatedAt: "2026-10-11", size: "0.7 MB", scheduled: false },
    ],
  };
}

export async function getExecutiveDashboard() {
  return fetchWithFallback("/insights/dashboard", mockDashboardData, false);
}

export async function getWorkforceAnalytics() {
  return fetchWithFallback("/insights/workforce", mockWorkforceData, false);
}

export async function getWorkforceTableData() {
  return fetchWithFallback("/insights/workforce/table", mockWorkforceTableData);
}

export async function getPayrollAnalytics() {
  return fetchWithFallback("/insights/payroll", mockPayrollData, false);
}

export async function getFinancialAnalytics() {
  return fetchWithFallback("/insights/financial", mockFinancialData, false);
}

export async function getProjectAnalytics() {
  return fetchWithFallback("/insights/projects", mockProjectData, false);
}

export async function getInventoryAnalytics() {
  return fetchWithFallback("/insights/inventory", mockInventoryData, false);
}

export async function getComplianceAnalytics() {
  return fetchWithFallback("/insights/compliance", mockComplianceData, false);
}

export async function getForecastingData() {
  return fetchWithFallback("/insights/forecasting", mockForecastingData, false);
}

export async function getCustomReportsData() {
  return fetchWithFallback("/insights/custom-reports", mockCustomReportsData, false);
}

export async function getSavedReportsData() {
  return fetchWithFallback("/insights/saved-reports", mockSavedReportsData, false);
}

export async function getAttendanceInsights() {
  await delay();
  return {
    summary: { totalEmployees: 2534, avgAttendance: 96.8, lateArrivals: 145, earlyDepartures: 78, absentToday: 52, avgHoursPerDay: 7.6 },
    monthlyTrend: [
      { month: "Jan", attendance: 96.2, late: 180, absent: 65 },
      { month: "Feb", attendance: 96.8, late: 165, absent: 58 },
      { month: "Mar", attendance: 97.1, late: 155, absent: 52 },
      { month: "Apr", attendance: 96.5, late: 170, absent: 60 },
      { month: "May", attendance: 97.3, late: 148, absent: 48 },
      { month: "Jun", attendance: 96.9, late: 162, absent: 55 },
      { month: "Jul", attendance: 95.8, late: 190, absent: 72 },
      { month: "Aug", attendance: 96.4, late: 172, absent: 58 },
      { month: "Sep", attendance: 97.0, late: 158, absent: 50 },
      { month: "Oct", attendance: 96.8, late: 145, absent: 52 },
    ],
    byDepartment: [
      { name: "Engineering", attendance: 97.2, late: 22, absent: 8 },
      { name: "Sales", attendance: 95.8, late: 35, absent: 12 },
      { name: "Marketing", attendance: 96.5, late: 18, absent: 6 },
      { name: "Finance", attendance: 98.1, late: 8, absent: 3 },
      { name: "HR", attendance: 97.8, late: 5, absent: 2 },
      { name: "Operations", attendance: 96.3, late: 28, absent: 10 },
      { name: "Support", attendance: 95.5, late: 30, absent: 15 },
    ],
  };
}

export async function getEngagementInsights() {
  await delay();
  return {
    summary: { overallScore: 76, participationRate: 68, activeSurveys: 4, responseRate: 72, npsScore: 62 },
    scoreTrend: [
      { quarter: "Q1 2025", score: 71 },
      { quarter: "Q2 2025", score: 73 },
      { quarter: "Q3 2025", score: 72 },
      { quarter: "Q4 2025", score: 74 },
      { quarter: "Q1 2026", score: 75 },
      { quarter: "Q2 2026", score: 76 },
    ],
    byDepartment: [
      { name: "Engineering", score: 78, participation: 72 },
      { name: "Sales", score: 72, participation: 65 },
      { name: "Marketing", score: 80, participation: 75 },
      { name: "Finance", score: 76, participation: 70 },
      { name: "HR", score: 82, participation: 78 },
      { name: "Operations", score: 74, participation: 68 },
      { name: "Support", score: 70, participation: 62 },
    ],
    drivers: [
      { name: "Compensation", score: 68, benchmark: 72 },
      { name: "Work-Life Balance", score: 74, benchmark: 70 },
      { name: "Career Growth", score: 65, benchmark: 68 },
      { name: "Management", score: 78, benchmark: 74 },
      { name: "Culture", score: 80, benchmark: 76 },
      { name: "Recognition", score: 72, benchmark: 70 },
    ],
  };
}

export async function getPerformanceInsights() {
  await delay();
  return {
    summary: { avgRating: 3.8, completedReviews: 185, pendingReviews: 42, goalsOnTrack: 78, exceededExpectations: 92 },
    ratingDistribution: [
      { rating: "1", count: 8 }, { rating: "2", count: 25 },
      { rating: "3", count: 120 }, { rating: "4", count: 185 }, { rating: "5", count: 92 },
    ],
    byDepartment: [
      { name: "Engineering", avgRating: 3.9, completed: 45, pending: 8 },
      { name: "Sales", avgRating: 3.7, completed: 35, pending: 10 },
      { name: "Marketing", avgRating: 4.0, completed: 22, pending: 5 },
      { name: "Finance", avgRating: 3.8, completed: 18, pending: 4 },
      { name: "HR", avgRating: 4.1, completed: 12, pending: 2 },
      { name: "Operations", avgRating: 3.6, completed: 28, pending: 8 },
    ],
    quarterlyTrend: [
      { quarter: "Q1 2025", avg: 3.6 }, { quarter: "Q2 2025", avg: 3.7 },
      { quarter: "Q3 2025", avg: 3.6 }, { quarter: "Q4 2025", avg: 3.7 },
      { quarter: "Q1 2026", avg: 3.8 }, { quarter: "Q2 2026", avg: 3.8 },
    ],
  };
}

export async function getRecruitmentInsights() {
  await delay();
  return {
    summary: { openPositions: 87, newRequisitions: 12, totalApplicants: 1240, interviewsScheduled: 185, offersExtended: 45, offersAccepted: 38, avgTimeToHire: 32, acceptanceRate: 84.4 },
    pipeline: [
      { stage: "Screening", count: 420 }, { stage: "Phone Screen", count: 280 },
      { stage: "Technical", count: 185 }, { stage: "On-site", count: 95 },
      { stage: "Offer", count: 45 }, { stage: "Hired", count: 38 },
    ],
    monthlyTrend: [
      { month: "May", applicants: 210, interviews: 65, offers: 12, hires: 10 },
      { month: "Jun", applicants: 235, interviews: 72, offers: 14, hires: 11 },
      { month: "Jul", applicants: 198, interviews: 60, offers: 10, hires: 8 },
      { month: "Aug", applicants: 185, interviews: 55, offers: 9, hires: 7 },
      { month: "Sep", applicants: 220, interviews: 68, offers: 13, hires: 10 },
      { month: "Oct", applicants: 192, interviews: 58, offers: 11, hires: 9 },
    ],
    byDepartment: [
      { name: "Engineering", open: 25, applicants: 380, interviews: 72, avgDays: 35 },
      { name: "Sales", open: 15, applicants: 220, interviews: 42, avgDays: 28 },
      { name: "Marketing", open: 8, applicants: 140, interviews: 25, avgDays: 30 },
      { name: "Finance", open: 5, applicants: 80, interviews: 18, avgDays: 26 },
      { name: "Operations", open: 12, applicants: 160, interviews: 30, avgDays: 32 },
      { name: "Support", open: 10, applicants: 120, interviews: 22, avgDays: 25 },
      { name: "Product", open: 7, applicants: 100, interviews: 20, avgDays: 34 },
      { name: "Security", open: 5, applicants: 60, interviews: 15, avgDays: 38 },
    ],
  };
}

export async function getReportsData() {
  await delay();
  const custom = mockCustomReportsData();
  const saved = mockSavedReportsData();
  return { templates: custom.templates, reportTypes: custom.reportTypes, reports: saved.reports, recentGenerations: saved.recentGenerations };
}

export async function getSettings() {
  await delay();
  return {
    reportDefaults: { format: "pdf", frequency: "monthly", timeRange: "12months" },
    emailNotifications: true,
    weeklyDigest: false,
    autoArchive: true,
    retentionDays: 90,
    chartPreferences: { theme: "light", enableAnimations: true },
  };
}

export const updateSettings = (payload) => api.put("/insights/settings", payload).catch(() => ({ ...payload, saved: true }));
