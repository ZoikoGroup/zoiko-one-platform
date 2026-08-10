/**
 * layout/BillingAdminLayout.jsx
 * -----------------------------
 * Billing Admin shared layout. Renders the EXISTING shared shell
 * (SuperAdminShell → Sidebar + Header), which keeps the sidebar exactly as it
 * is for every other role. Billing Admin only changes which sections/items are
 * visible inside that sidebar via the shared filtering engine; the layout
 * itself is unchanged shared architecture. Also mounts the Billing command
 * palette (Ctrl/Cmd+K) — scoped to Billing routes only, since it lives here
 * rather than in the app-wide SuperAdminShell/Header.
 */

import SuperAdminShell from "../../../components/SuperAdminShell";
import BillingCommandPalette from "./BillingCommandPalette";

export default function BillingAdminLayout({ children }) {
  return (
    <SuperAdminShell>
      {children}
      <BillingCommandPalette />
    </SuperAdminShell>
  );
}
