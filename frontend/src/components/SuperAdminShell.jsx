import { useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

// Paths whose header should be hidden. Payroll runs its own in-module
// header (see DashboardPage.jsx's dark header bar), so the outer
// SuperAdminShell header would be redundant/wasted vertical space there.
// Add more prefixes here if other products want the same treatment.
const HIDE_HEADER_PREFIXES = ["/payroll"];

// Every Billing dashboard landing page shares an executive toolbar (search +
// date range + refresh + export + primary action on one row at desktop
// widths) that needs more horizontal room than the platform's default
// max-w-7xl gives every other module. Widen the content column only for
// these exact paths — every other route (including other Billing pages like
// list/detail/settings/reports) keeps the standard max-w-7xl.
const WIDE_CONTENT_PATHS = [
  "/billing",
  "/billing/customers/dashboard",
  "/billing/products/dashboard",
  "/billing/pricing/dashboard",
  "/billing/quotations/dashboard",
  "/billing/contracts/dashboard",
  "/billing/subscriptions/dashboard",
  "/billing/invoices/dashboard",
  "/billing/credit-notes/dashboard",
  "/billing/payments/dashboard",
  "/billing/collections/dashboard",
  "/billing/refunds/dashboard",
  "/billing/write-offs/dashboard",
  "/billing/tax/dashboard",
];

export default function SuperAdminShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const hideHeader = HIDE_HEADER_PREFIXES.some(
    (prefix) => location.pathname === prefix || location.pathname.startsWith(prefix + "/")
  );
  const wideContent = WIDE_CONTENT_PATHS.includes(location.pathname);

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
          <main className={`mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 ${wideContent ? "max-w-[1600px]" : "max-w-7xl"}`}>{children}</main>
        )}
      </div>
    </div>
  );
}