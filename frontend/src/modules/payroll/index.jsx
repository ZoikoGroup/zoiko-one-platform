import { useLocation, NavLink } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Users, PlayCircle, FileText, ShieldCheck,
  Sparkles, X, ChevronRight,
} from "lucide-react";
import { ToastProvider, useToast } from "./ToastContext";

import DashboardPage  from "./DashBoards/DashboardPage";
import EmployeeList   from "./Payroll_Employees/EmployeeListPage";
import PayrollRunsPage from "./PayRollRuns/PayrollRunsPage";
import PayslipsPage   from "./PaySlips/PayslipsPage";
import CompliancePage from "./Compliances/CompliancePage";

const pageMap = {
  "/payroll":                <DashboardPage />,
  "/payroll/employees":      <EmployeeList />,
  "/payroll/payroll-runs":   <PayrollRunsPage />,
  "/payroll/payslips":       <PayslipsPage />,
  "/payroll/compliances":    <CompliancePage />,
};

const navItems = [
  { label: "Dashboard",     href: "/payroll",               icon: LayoutDashboard },
  { label: "Employees",     href: "/payroll/employees",     icon: Users           },
  { label: "Payroll Runs",  href: "/payroll/payroll-runs",  icon: PlayCircle      },
  { label: "Payslips",      href: "/payroll/payslips",      icon: FileText        },
  { label: "Compliance",    href: "/payroll/compliances",   icon: ShieldCheck     },
];

const AI_PROMPTS = [
  "Explain gross pay calculation",
  "Why did net pay decrease this period?",
  "What does a hard exception mean?",
  "Summarize last payroll run",
  "Explain employer PF contributions",
  "What is dual-control approval?",
];

function PayrollLayout({ children }) {
  const { pathname } = useLocation();
  const [aiOpen, setAiOpen] = useState(false);
  const { toasts, removeToast } = useToast();

  return (
    <div className="flex h-full min-h-screen bg-slate-50 font-sans relative">

      <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-white px-3 py-6 hidden xl:flex flex-col gap-1">
        <p className="mb-3 px-3 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
          Zoiko Payroll
        </p>

        {navItems.map((item) => {
          const active = item.href === "/payroll"
            ? pathname === "/payroll"
            : pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/payroll"}
              className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm transition-all duration-150 ${
                active
                  ? "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <item.icon size={15} />
              {item.label}
              {active && <ChevronRight size={13} className="ml-auto opacity-50" />}
            </NavLink>
          );
        })}

        <button
          onClick={() => setAiOpen(true)}
          className="mt-auto flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm text-violet-600 hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-all font-medium"
        >
          <Sparkles size={15} />
          AI Assistant
        </button>
      </aside>

      <div className="flex-1 overflow-auto">{children}</div>

      {aiOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/20" onClick={() => setAiOpen(false)} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-80 border-l border-slate-200 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">AI Assistant</p>
                  <p className="text-[10px] text-slate-400">Payroll explainer · Read-only</p>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                <p className="text-sm font-semibold text-violet-800 mb-1">What can I help with?</p>
                <p className="text-xs text-violet-600 leading-relaxed">
                  I can explain calculations, clarify deductions, summarize run statuses, and highlight anomalies.
                </p>
              </div>

              {AI_PROMPTS.map((q) => (
                <button
                  key={q}
                  className="w-full text-left rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition-all"
                >
                  {q}
                </button>
              ))}

              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">⚠ AI Governance Boundary</p>
                <p className="text-xs text-amber-600 leading-relaxed">
                  AI cannot calculate payroll, change salaries, modify tax rules, approve payroll runs,
                  or release payments. These actions require human approval via Zoiko Workflow.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4">
              <input
                type="text"
                placeholder="Ask about payroll..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:bg-white"
              />
            </div>
          </aside>
        </>
      )}

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
