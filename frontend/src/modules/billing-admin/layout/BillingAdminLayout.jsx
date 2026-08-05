/**
 * layout/BillingAdminLayout.jsx
 * -----------------------------
 * Billing Admin shared layout. Renders the EXISTING shared shell
 * (SuperAdminShell → Sidebar + Header), which keeps the sidebar exactly as it
 * is for every other role. Billing Admin only changes which sections/items are
 * visible inside that sidebar via the shared filtering engine; the layout
 * itself is unchanged shared architecture.
 */

import SuperAdminShell from "../../../components/SuperAdminShell";

export default function BillingAdminLayout({ children }) {
  return <SuperAdminShell>{children}</SuperAdminShell>;
}
