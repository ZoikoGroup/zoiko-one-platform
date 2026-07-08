import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { ToastProvider, useToast } from "./ToastContext";

import DashboardPage  from "./DashBoards/DashboardPage";
import EmployeeList   from "./Payroll_Employees/EmployeeListPage";
import PayrollRunsPage from "./PayRollRuns/PayrollRunsPage";
import PayslipsPage   from "./PaySlips/PayslipsPage";
import CompliancePage from "./Compliances/CompliancePage";
import AttendancePage from "./Attendance/AttendancePage";
import PayrollLeavesPage from "./Attendance/Payroll_Leaves";
import ReportsPage from "./Reports/ReportsPage";

const pageMap = {
  "/payroll":                <DashboardPage />,
  "/payroll/employees":      <EmployeeList />,
  "/payroll/payroll-runs":   <PayrollRunsPage />,
  "/payroll/payslips":       <PayslipsPage />,
  "/payroll/compliances":    <CompliancePage />,
  "/payroll/attendance":     <AttendancePage />,
  "/payroll/leaves":         <PayrollLeavesPage />,
  "/payroll/reports":        <ReportsPage />,
};

function PayrollLayout({ children }) {
  const { toasts, removeToast } = useToast();

  return (
    <div className="flex h-full min-h-screen bg-slate-50 font-sans relative">

      <div className="flex-1 overflow-auto">{children}</div>

      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 shadow-lg flex items-center justify-between text-sm transition-all ${
              toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : toast.type === "error" ? "bg-red-50 border-red-200 text-red-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-3 rounded-lg p-1 hover:bg-slate-200/50 text-slate-400">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ZoikoPayrollModule() {
  const { pathname } = useLocation();
  const page = pageMap[pathname] ?? <DashboardPage />;
  return (
    <ToastProvider>
      <PayrollLayout>{page}</PayrollLayout>
    </ToastProvider>
  );
}
