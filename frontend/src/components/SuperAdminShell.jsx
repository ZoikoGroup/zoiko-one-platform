import { useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

// Paths whose header should be hidden. Payroll runs its own in-module
// header (see DashboardPage.jsx's dark header bar), so the outer
// SuperAdminShell header would be redundant/wasted vertical space there.
// Add more prefixes here if other products want the same treatment.
const HIDE_HEADER_PREFIXES = ["/payroll"];

export default function SuperAdminShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const hideHeader = HIDE_HEADER_PREFIXES.some(
    (prefix) => location.pathname === prefix || location.pathname.startsWith(prefix + "/")
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        {!hideHeader && <Header onMenuClick={() => setSidebarOpen(true)} />}
        {hideHeader ? (
          // Full-bleed: Payroll's own pages already manage their own
          // background/padding (e.g. DashboardPage's `bg-black p-6
          // lg:p-8`). Wrapping them in this shell's `max-w-7xl` +
          // padding would double up spacing and leave a visible gap
          // between the sidebar and the module's own content box.
          <main className="w-full">{children}</main>
        ) : (
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        )}
      </div>
    </div>
  );
}