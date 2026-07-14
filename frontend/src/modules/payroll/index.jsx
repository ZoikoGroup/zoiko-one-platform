import { useLocation, useNavigate } from "react-router-dom";
import { X, Moon, Sun } from "lucide-react";
import { ToastProvider, useToast } from "./ToastContext";
import { DarkModeProvider, useDarkMode } from "../../context/DarkModeContext";

import DashboardPage  from "./DashBoards/DashboardPage";
import EmployeeList   from "./Payroll_Employees/EmployeeListPage";
import PayrollRunsPage from "./PayRollRuns/PayrollRunsPage";
import PayslipsPage   from "./PaySlips/PayslipsPage";
import CompliancePage from "./Compliances/CompliancePage";
import AttendancePage from "./Attendance/AttendancePage";
import PayrollLeavesPage from "./Attendance/Payroll_Leaves";
import ReportsPage from "./Reports/ReportsPage";

const pageMap = (navigate) => ({
  "/payroll":                <DashboardPage onNewPayrollRun={() => navigate("/payroll/payroll-runs")} />,
  "/payroll/employees":      <EmployeeList />,
  "/payroll/payroll-runs":   <PayrollRunsPage />,
  "/payroll/payslips":       <PayslipsPage />,
  "/payroll/compliances":    <CompliancePage />,
  "/payroll/attendance":     <AttendancePage />,
  "/payroll/leaves":         <PayrollLeavesPage />,
  "/payroll/reports":        <ReportsPage />,
});

function DarkModeToggle() {
  const { isDark, toggle } = useDarkMode();
  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed top-4 right-4 z-[9998] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 shadow-md hover:shadow-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function PayrollLayout({ children }) {
  const { toasts, removeToast } = useToast();

  return (
    <div className="flex h-full min-h-screen bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors">

      <div className="flex-1 overflow-auto">{children}</div>

      <DarkModeToggle />

      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 shadow-lg flex items-center justify-between text-sm transition-all ${
              toast.type === "success" ? "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300"
              : toast.type === "error" ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
              : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-3 rounded-lg p-1 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 dark:text-slate-500">
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
  const navigate = useNavigate();
  const pages = pageMap(navigate);
  const page = pages[pathname] ?? <DashboardPage onNewPayrollRun={() => navigate("/payroll/payroll-runs")} />;
  return (
    <DarkModeProvider>
      <ToastProvider>
        <PayrollLayout>{page}</PayrollLayout>
      </ToastProvider>
    </DarkModeProvider>
  );
}
