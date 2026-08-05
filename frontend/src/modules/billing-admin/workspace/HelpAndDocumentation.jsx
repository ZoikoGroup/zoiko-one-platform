/**
 * workspace/HelpAndDocumentation.jsx
 * -----------------------------------
 * "MY ORGANIZATION → Help & Documentation" — points Billing Admins at the
 * platform's support surface. Lightweight placeholder; deep Billing docs
 * remain in the Billing product.
 */

import { useNavigate } from "react-router-dom";
import { BookOpen, LifeBuoy, MessagesSquare, FileText } from "lucide-react";
import WorkspaceHeader from "./WorkspaceHeader";

const LINKS = [
  { icon: BookOpen, title: "Billing Guide", text: "Learn about invoices, payments, subscriptions and more.", href: "/billing" },
  { icon: FileText, title: "Configuration Reference", text: "Review your organization billing settings.", href: "/billing/settings" },
  { icon: MessagesSquare, title: "Support Center", text: "Reach the platform support team.", href: "/super-admin/support-tickets" },
];

export default function HelpAndDocumentation() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        title="Help & Documentation"
        organization={null}
        health={null}
        plan={null}
        outstanding={null}
        fiscalYear={null}
        currency={null}
        icon={LifeBuoy}
      />

      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        {LINKS.map((link) => (
          <button
            key={link.title}
            type="button"
            onClick={() => navigate(link.href)}
            className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-[#FF7A00]/40 hover:shadow-lg"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white shadow-sm">
              <link.icon size={19} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800">{link.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{link.text}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <LifeBuoy size={17} />
          </span>
          <div className="text-xs leading-relaxed text-slate-500">
            <p className="font-semibold text-slate-700">Need more help?</p>
            <p className="mt-1">
              The full Zoiko Billing product, its settings, reports and configuration live under{" "}
              <span className="font-semibold text-slate-700">Zoiko Billing</span> in the sidebar. Every Billing Admin action
              reuses those existing pages — this workspace only orchestrates the experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
