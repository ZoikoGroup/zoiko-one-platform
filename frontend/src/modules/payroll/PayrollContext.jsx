// ─────────────────────────────────────────────────────────────────────────────
// PayrollContext.jsx
// Global state layer for Zoiko Payroll.
// Owns: employees, runs, exceptions, approvals, payments, settings, company.
// Rule: No product rebuilds shared services. ZoikoID = auth, ZoikoPay = money,
//       ZoikoCoreX = financial truth. This context wires the payroll domain only.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect } from "react";

const PayrollContext = createContext();

// ── Seed Data ─────────────────────────────────────────────────────────────────

const initialEmployees = [
  { id: "EMP-0001", name: "Arjun Nair",    dept: "Engineering", type: "Full-time", salary: 120000, status: "Active",   ready: true,  pan: "ABCDE1234F", bankName: "HDFC Bank",  bankAcc: "4821", bankIfsc: "HDFC0001234", bankType: "Savings" },
  { id: "EMP-0002", name: "Priya Sharma",  dept: "Marketing",   type: "Full-time", salary: 95000,  status: "Active",   ready: true,  pan: "ABCDE5678G", bankName: "HDFC Bank",  bankAcc: "9988", bankIfsc: "HDFC0001234", bankType: "Savings" },
  { id: "EMP-0003", name: "Rohit Kumar",   dept: "Finance",     type: "Contract",  salary: 75000,  status: "Active",   ready: false, pan: "",           bankName: "ICICI Bank", bankAcc: "1122", bankIfsc: "ICIC0007703", bankType: "Current" },
  { id: "EMP-0004", name: "Sneha Patel",   dept: "HR",          type: "Full-time", salary: 88000,  status: "Active",   ready: true,  pan: "ABCDE9911X", bankName: "Axis Bank",  bankAcc: "3344", bankIfsc: "UTIB0000123", bankType: "Savings" },
  { id: "EMP-0005", name: "Vikram Singh",  dept: "Sales",       type: "Full-time", salary: 105000, status: "On Leave", ready: true,  pan: "ABCDE2233Y", bankName: "SBI Bank",   bankAcc: "5566", bankIfsc: "SBIN0001234", bankType: "Savings" },
  { id: "EMP-0006", name: "Ananya Joshi",  dept: "Engineering", type: "Full-time", salary: 135000, status: "Active",   ready: false, pan: "ABCDE8822Z", bankName: "",           bankAcc: "",     bankIfsc: "",            bankType: "" },
  { id: "EMP-0007", name: "Ravi Menon",    dept: "Design",      type: "Part-time", salary: 55000,  status: "Active",   ready: true,  pan: "ABCDE7744K", bankName: "HDFC Bank",  bankAcc: "2211", bankIfsc: "HDFC0001234", bankType: "Savings" },
];

const initialRuns = [
  { id: "PR-0042", period: "Jun 1–15, 2026",  payDate: "2026-06-15", employees: 1248, gross: "₹84,23,000", net: "₹63,18,000", status: "Review" },
  { id: "PR-0041", period: "May 16–31, 2026", payDate: "2026-05-31", employees: 1235, gross: "₹82,14,000", net: "₹61,80,000", status: "Closed" },
  { id: "PR-0040", period: "May 1–15, 2026",  payDate: "2026-05-15", employees: 1230, gross: "₹80,50,000", net: "₹60,40,000", status: "Paid" },
  { id: "PR-0039", period: "Apr 16–30, 2026", payDate: "2026-04-30", employees: 1218, gross: "₹78,90,000", net: "₹59,10,000", status: "Closed" },
];

const initialExceptions = [
  { id: "EXC-001", employee: "Rohit Kumar",  issue: "Missing PAN / Tax ID",             impact: "Cannot calculate TDS",            type: "hard",    empId: "EMP-0003" },
  { id: "EXC-002", employee: "Ananya Joshi", issue: "Invalid bank account details",      impact: "Payment will fail",               type: "hard",    empId: "EMP-0006" },
  { id: "WRN-001", employee: "Vikram Singh", issue: "Overtime spike — 45 hrs overtime",  impact: "Gross pay increased by 18%",      type: "warning", empId: "EMP-0005" },
  { id: "WRN-002", employee: "Priya Sharma", issue: "Large pay variance vs. last period",impact: "Net pay changed by +12%",         type: "warning", empId: "EMP-0002" },
  { id: "WRN-003", employee: "Deepak Reddy", issue: "Terminated employee in run",        impact: "Review required before proceeding",type: "warning" },
  { id: "WRN-004", employee: "Karan Mehta",  issue: "ESI deduction calculation mismatch",impact: "Difference of ₹120",             type: "warning" },
  { id: "WRN-005", employee: "Sunita Rao",   issue: "Leave encashment not configured",   impact: "Payout pending configuration",    type: "warning" },
];

const initialApprovalStages = [
  { role: "Payroll Manager",    person: "Meera Iyer",   action: "Submit for Review",   status: "done",    time: "Jun 12, 2026 · 10:42 AM" },
  { role: "Finance Approver",   person: "Rajesh Bose",  action: "Approve Payroll",     status: "pending", time: null },
  { role: "Payment Authorizer", person: "Sunita Nair",  action: "Authorize Payment",   status: "locked",  time: null },
];

const initialPaymentBatches = [
  { id: "PB-0042", run: "PR-0042", employees: 1248, amount: "₹63,18,000", status: "Pending",  created: "Jun 14, 2026" },
  { id: "PB-0041", run: "PR-0041", employees: 1235, amount: "₹61,80,000", status: "Paid",     created: "May 30, 2026" },
  { id: "PB-0040", run: "PR-0040", employees: 1230, amount: "₹60,40,000", status: "Paid",     created: "May 14, 2026" },
  { id: "PB-0038", run: "PR-0038", employees: 10,   amount: "₹2,50,000",  status: "Failed",   created: "Apr 10, 2026" },
];

// ── Provider ───────────────────────────────────────────────────────────────────

export function PayrollProvider({ children }) {
  const [employees,      setEmployees]      = useState(initialEmployees);
  const [runs,           setRuns]           = useState(initialRuns);
  const [exceptions,     setExceptions]     = useState(initialExceptions);
  const [approvalStages, setApprovalStages] = useState(initialApprovalStages);
  const [paymentBatches, setPaymentBatches] = useState(initialPaymentBatches);
  const [toasts,         setToasts]         = useState([]);

  const [settings, setSettings] = useState({
    offCycle:        true,
    autoCalc:        true,
    dualControl:     true,
    auditLog:        true,
    employeePayslip: true,
    emailNotifs:     false,
    slackNotifs:     false,
    aiAssistant:     true,
  });

  const [companyDetails, setCompanyDetails] = useState({
    name:                "Zoiko Technologies Pvt. Ltd.",
    type:                "Private Limited Company",
    taxNo:               "27AABCZ1234M1ZX",
    employerId:          "EMP-IN-MH-00123",
    address:             "Bandra Kurla Complex, Mumbai",
    industry:            "Software / Technology",
    schedule:            "semi-monthly",
    payDateRule:         "Last working day of month",
    offCyclePayroll:     "Enabled",
    bankName:            "HDFC Bank",
    bankAcc:             "4821",
    bankIfsc:            "HDFC0001234",
    bankType:            "Current",
    settlementBank:      "ICICI Bank",
    settlementAcc:       "7703",
    jurisdictionCountry: "India",
    jurisdictionState:   "Maharashtra",
    compliancePack:      "India Standard v2.1",
  });

  const [checklist, setChecklist] = useState([
    { id: "chk-name",     label: "Company name & legal entity",          done: true  },
    { id: "chk-tax",      label: "Tax registration number",              done: true  },
    { id: "chk-empId",    label: "Employer ID registered",               done: true  },
    { id: "chk-sched",    label: "Payroll schedule configured",          done: true  },
    { id: "chk-bank",     label: "Payroll bank account linked",          done: true  },
    { id: "chk-settle",   label: "Settlement account verified",          done: false },
    { id: "chk-juris",    label: "Jurisdiction & compliance pack selected", done: true },
    { id: "chk-stateTax", label: "State tax details entered",            done: false },
  ]);

  // ── Toast helpers ────────────────────────────────────────────────────────────

  const addToast = (message, type = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Derived checklist from company details ───────────────────────────────────

  useEffect(() => {
    setChecklist((prev) =>
      prev.map((c) => {
        if (c.id === "chk-settle")   return { ...c, done: !!(companyDetails.settlementBank && companyDetails.settlementAcc) };
        if (c.id === "chk-stateTax") return { ...c, done: !!(companyDetails.jurisdictionState && companyDetails.compliancePack) };
        return c;
      })
    );
  }, [companyDetails]);

  // ── Employee helpers ─────────────────────────────────────────────────────────

  const checkEmployeeReadiness = (emp) => !!(emp.pan && emp.bankName && emp.bankAcc);

  const addEmployee = (newEmp) => {
    const id  = `EMP-00${String(employees.length + 1).padStart(2, "0")}`;
    const emp = { ...newEmp, id, ready: checkEmployeeReadiness(newEmp), status: newEmp.status || "Active" };
    setEmployees((prev) => [...prev, emp]);
    addToast(`Employee ${emp.name} added successfully!`, "success");
  };

  const updateEmployee = (id, updatedFields) => {
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const merged = { ...e, ...updatedFields };
        merged.ready = checkEmployeeReadiness(merged);
        return merged;
      })
    );
    // Auto-resolve linked exceptions when data is corrected
    if (id === "EMP-0003" && updatedFields.pan) {
      setExceptions((prev) => prev.filter((exc) => exc.id !== "EXC-001"));
      addToast("PAN Tax ID updated — Exception EXC-001 resolved!", "success");
    }
    if (id === "EMP-0006" && updatedFields.bankName && updatedFields.bankAcc) {
      setExceptions((prev) => prev.filter((exc) => exc.id !== "EXC-002"));
      addToast("Bank details updated — Exception EXC-002 resolved!", "success");
    }
  };

  // ── Exception helpers ────────────────────────────────────────────────────────

  const resolveException = (excId) => {
    if (excId === "EXC-001") {
      updateEmployee("EMP-0003", { pan: "ABCDE1122Q" });
    } else if (excId === "EXC-002") {
      updateEmployee("EMP-0006", { bankName: "HDFC Bank", bankAcc: "7766", bankIfsc: "HDFC0001234", bankType: "Savings" });
    } else {
      setExceptions((prev) => prev.filter((e) => e.id !== excId));
      addToast(`Warning ${excId} acknowledged.`, "info");
    }
  };

  // ── Payroll Run helpers ──────────────────────────────────────────────────────

  const createRunDraft = (scheduleType, periodText, payDateText) => {
    let totalGross = 0, totalTaxes = 0, totalNet = 0;

    employees.forEach((emp) => {
      if (emp.status === "Active" || emp.status === "On Leave") {
        const gross = parseFloat(emp.salary) || 0;
        const tax   = Math.round(gross * 0.1);          // TDS 10%
        const pf    = Math.round(gross * 0.12);         // PF 12%
        const esi   = Math.round(gross * 0.0075);       // ESI 0.75%
        const pt    = 200;                              // Professional Tax fixed
        totalGross  += gross;
        totalTaxes  += tax;
        totalNet    += gross - (tax + pf + esi + pt);
      }
    });

    const runId  = `PR-00${String(runs.length + 1).padStart(2, "0")}`;
    const newRun = {
      id:        runId,
      period:    periodText,
      payDate:   payDateText,
      employees: employees.length,
      gross:     `₹${(totalGross / 100000).toFixed(2)}L`,
      net:       `₹${(totalNet   / 100000).toFixed(2)}L`,
      status:    "Review",
    };

    setRuns((prev) => [newRun, ...prev]);

    // Reset approval chain for new run
    setApprovalStages([
      { role: "Payroll Manager",    person: "Meera Iyer",  action: "Submit for Review",  status: "done",    time: new Date().toLocaleString() },
      { role: "Finance Approver",   person: "Rajesh Bose", action: "Approve Payroll",    status: "pending", time: null },
      { role: "Payment Authorizer", person: "Sunita Nair", action: "Authorize Payment",  status: "locked",  time: null },
    ]);

    // Create corresponding payment batch (via ZoikoPay integration point)
    setPaymentBatches((prev) => [{
      id:        `PB-00${String(runs.length + 1).padStart(2, "0")}`,
      run:       runId,
      employees: employees.length,
      amount:    `₹${(totalNet / 100000).toFixed(2)}L`,
      status:    "Pending",
      created:   new Date().toLocaleDateString(),
    }, ...prev]);

    addToast(`Payroll Run ${runId} created successfully!`, "success");
    return runId;
  };

  // ── Approval helpers ─────────────────────────────────────────────────────────

  const approveStage = (idx) => {
    setApprovalStages((prev) => {
      const updated = prev.map((s, i) => {
        if (i === idx)     return { ...s, status: "done",    time: new Date().toLocaleString() };
        if (i === idx + 1 && s.status === "locked") return { ...s, status: "pending" };
        return s;
      });
      const allDone = updated.every((s) => s.status === "done");
      if (allDone) {
        setRuns((r) => r.map((run, ri) => (ri === 0 ? { ...run, status: "Authorized" } : run)));
        addToast("Payroll fully authorized — ready for payment release!", "success");
      } else {
        addToast(`Approval completed: ${prev[idx].role}`, "success");
      }
      return updated;
    });
  };

  // ── Payment helpers (delegates money movement to ZoikoPay) ───────────────────

  const releasePayments = (batchId) => {
    setPaymentBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, status: "Processing" } : b));
    setTimeout(() => {
      setPaymentBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, status: "Paid" } : b));
      setRuns((prev) => prev.map((r, ri) => (ri === 0 ? { ...r, status: "Paid" } : r)));
      addToast(`Payment batch ${batchId} released via ZoikoPay!`, "success");
    }, 2000);
  };

  return (
    <PayrollContext.Provider value={{
      employees, runs, exceptions, approvalStages, paymentBatches,
      settings, companyDetails, checklist, toasts,
      setRuns, setSettings, setCompanyDetails,
      addEmployee, updateEmployee, resolveException,
      createRunDraft, approveStage, releasePayments,
      addToast, removeToast,
    }}>
      {children}
    </PayrollContext.Provider>
  );
}

export function usePayroll() {
  return useContext(PayrollContext);
}