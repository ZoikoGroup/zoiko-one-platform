/**
 * layout/BillingCommandPalette.jsx
 * ---------------------------------
 * Global Ctrl+K / Cmd+K command palette for the Billing product. Lets the
 * Billing Administrator jump to any Billing section or quick-create action
 * without hunting through the sidebar — every destination below is an
 * existing, already-registered Billing route (see App.jsx's route table).
 * No new pages, no API calls, no business logic; this is pure navigation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search, CornerDownLeft, ArrowUp, ArrowDown, Command,
  LayoutDashboard, Building2, Users, Package, Tag, FileSignature, FileText,
  Receipt, CreditCard, Wallet, Landmark, AlertTriangle, RotateCcw, Ban,
  Percent, BarChart3, TrendingUp, Settings, Plus, UserPlus,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Billing Dashboard", hint: "Financial overview", href: "/billing", icon: LayoutDashboard, group: "Navigate" },
  { label: "Workspace Overview", hint: "Organization & workspace management", href: "/billing/workspace/dashboard", icon: Building2, group: "Navigate" },
  { label: "Customers", hint: "Customer list", href: "/billing/customers", icon: Users, group: "Navigate" },
  { label: "Products", hint: "Product catalog", href: "/billing/products", icon: Package, group: "Navigate" },
  { label: "Pricing", hint: "Pricing plans", href: "/billing/pricing", icon: Tag, group: "Navigate" },
  { label: "Quotations", hint: "Quotes", href: "/billing/quotations", icon: FileSignature, group: "Navigate" },
  { label: "Contracts", hint: "Active & draft contracts", href: "/billing/contracts", icon: FileSignature, group: "Navigate" },
  { label: "Subscriptions", hint: "Recurring plans", href: "/billing/subscriptions", icon: CreditCard, group: "Navigate" },
  { label: "Invoices", hint: "All invoices", href: "/billing/invoices", icon: FileText, group: "Navigate" },
  { label: "Credit Notes", hint: "Issued credit notes", href: "/billing/credit-notes", icon: FileText, group: "Navigate" },
  { label: "Payments", hint: "Money in", href: "/billing/payments", icon: Wallet, group: "Navigate" },
  { label: "Collections & Receivables", hint: "Outstanding follow-up", href: "/billing/collections-receivables", icon: Landmark, group: "Navigate" },
  { label: "Dunning", hint: "Overdue escalation", href: "/billing/dunning", icon: AlertTriangle, group: "Navigate" },
  { label: "Refunds", hint: "Issued refunds", href: "/billing/refunds", icon: RotateCcw, group: "Navigate" },
  { label: "Write-Offs", hint: "Written-off balances", href: "/billing/write-offs", icon: Ban, group: "Navigate" },
  { label: "Tax", hint: "Tax rates & configuration", href: "/billing/tax", icon: Percent, group: "Navigate" },
  { label: "Reports", hint: "Revenue, collections & more", href: "/billing/reports", icon: BarChart3, group: "Navigate" },
  { label: "Forecast", hint: "Cash-flow forecast", href: "/billing/reports/forecast", icon: TrendingUp, group: "Navigate" },
  { label: "Billing Settings", hint: "Workspace configuration", href: "/billing/settings", icon: Settings, group: "Navigate" },
];

const QUICK_ACTIONS = [
  { label: "Create Invoice", hint: "Bill a customer", href: "/billing/invoices/create", icon: Receipt, group: "Quick Actions" },
  { label: "Create Quotation", hint: "Send a quote", href: "/billing/quotations/create", icon: FileSignature, group: "Quick Actions" },
  { label: "Create Contract", hint: "Draft a contract", href: "/billing/contracts/create", icon: FileText, group: "Quick Actions" },
  { label: "Create Subscription", hint: "Start a recurring plan", href: "/billing/subscriptions/create", icon: CreditCard, group: "Quick Actions" },
  { label: "Add Customer", hint: "Add a new customer", href: "/billing/customers", icon: UserPlus, group: "Quick Actions" },
  { label: "Add Product", hint: "Add a product or service", href: "/billing/products", icon: Plus, group: "Quick Actions" },
  { label: "Record Payment", hint: "Log an incoming payment", href: "/billing/payments", icon: Wallet, group: "Quick Actions" },
];

const ALL_ITEMS = [...QUICK_ACTIONS, ...NAV_ITEMS];

const WORKFLOW_ROUTE_PATTERNS = [
  /^\/billing\/(?:invoices|quotations|contracts|subscriptions)\/create$/,
  /^\/billing\/(?:invoices|contracts)\/[^/]+\/edit$/,
];

const DETAIL_ROUTES_WITH_BOTTOM_UI = new Set(["invoices", "credit-notes", "refunds", "write-offs"]);
const RESERVED_DETAIL_SLUGS = new Set(["create", "dashboard", "reports", "settings"]);

function shouldHideFloatingTrigger(pathname, search) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (WORKFLOW_ROUTE_PATTERNS.some((pattern) => pattern.test(path))) return true;

  const params = new URLSearchParams(search || "");
  if (path.startsWith("/billing/") && params.get("create") === "1") return true;

  const detailMatch = path.match(/^\/billing\/([^/]+)\/([^/]+)$/);
  if (!detailMatch) return false;
  const [, section, slug] = detailMatch;
  return DETAIL_ROUTES_WITH_BOTTOM_UI.has(section) && !RESERVED_DETAIL_SLUGS.has(slug);
}

export default function BillingCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const hideFloatingTrigger = useMemo(
    () => shouldHideFloatingTrigger(location.pathname, location.search),
    [location.pathname, location.search]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_ITEMS;
    return ALL_ITEMS.filter((item) => `${item.label} ${item.hint || ""}`.toLowerCase().includes(q));
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const select = useCallback((item) => {
    if (!item) return;
    close();
    navigate(item.href);
  }, [close, navigate]);

  useEffect(() => {
    close();
  }, [location.pathname, location.search, close]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isK = e.key === "k" || e.key === "K";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === "Escape") {
        setOpen((prev) => (prev ? false : prev));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleInputKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[activeIndex]);
    }
  };

  return (
    <>
      {!hideFloatingTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-500 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-600 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 sm:flex"
          aria-label="Open Billing command palette"
        >
          <Search size={14} />
          Search Billing
          <span className="ml-1 inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
            <Command size={10} />K
          </span>
        </button>
      )}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Billing command palette"
            onClick={close}
          >
            <div
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
                <Search size={17} className="shrink-0 text-slate-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Jump to a page or action…"
                  aria-label="Search Billing pages and actions"
                  className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:block">
                  ESC
                </kbd>
              </div>

              <div className="max-h-[60vh] overflow-y-auto py-2" role="listbox" aria-label="Command palette results">
                {results.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">No matches for &ldquo;{query}&rdquo;</p>
                ) : (
                  (() => {
                    let lastGroup = null;
                    return results.map((item, idx) => {
                      const isActive = idx === activeIndex;
                      const showGroup = item.group !== lastGroup;
                      lastGroup = item.group;
                      const Icon = item.icon;
                      return (
                        <div key={item.href + item.label}>
                          {showGroup && (
                            <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 first:pt-1">
                              {item.group}
                            </p>
                          )}
                          <button
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => select(item)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isActive ? "bg-brand-50/70" : "hover:bg-slate-50"
                            }`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-brand text-white" : "bg-slate-100 text-slate-500"}`}>
                              <Icon size={15} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                              {item.hint && <span className="block truncate text-xs text-slate-400">{item.hint}</span>}
                            </span>
                            {isActive && <CornerDownLeft size={13} className="shrink-0 text-brand-500" />}
                          </button>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[10px] font-medium text-slate-400">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><ArrowUp size={11} /><ArrowDown size={11} />Navigate</span>
                  <span className="flex items-center gap-1"><CornerDownLeft size={11} />Select</span>
                </span>
                <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
