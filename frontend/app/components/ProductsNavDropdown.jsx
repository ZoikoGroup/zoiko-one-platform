import React, { useState } from "react";
import {
  ChevronDown,
  Users,
  Clock,
  DollarSign,
  Grid3x3,
  ArrowLeftRight,
  LayoutGrid,
  Hexagon,
  CheckCircle2,
  BarChart3,
  SquareDot,
} from "lucide-react";

/**
 * Zoiko One — top nav "Products" dropdown
 *
 * Color tokens (sampled from screenshot):
 *  - Navy text/heading:     #161B33
 *  - Body gray:             #5B6373
 *  - Column label gray:     #8A93A3 (PEOPLE / MONEY / CONTROL eyebrows)
 *  - Icon blue (People):    #2B3FE0  (Zoiko HR, ZoikoTime, Zoiko Payroll square bg)
 *  - Icon orange (Money):   #D97B3F  (Zoiko Billing, Zoiko Spend)
 *  - Icon bright blue:      #3B9CE0  (Zoiko Projects)
 *  - Icon deep navy:        #1E2A6A  (Zoiko Inventory, Zoiko Comply, Zoiko Insights)
 *  - Icon orange (premium): #C2672E  (Zoiko Docs Pro)
 *  - Dropdown bg:           #FFFFFF
 *  - Dropdown border:       #E6E8EC
 *  - Dropdown shadow:       0 24px 60px rgba(20,25,50,0.12)
 */

const NAVY = "#161B33";
const BODY = "#5B6373";
const LABEL_GRAY = "#8A93A3";
const BLUE = "#2B3FE0";
const ORANGE = "#D97B3F";
const ORANGE_DARK = "#C2672E";
const ICON_BRIGHT_BLUE = "#3B9CE0";
const ICON_NAVY = "#1E2A6A";
const BORDER = "#E6E8EC";

const columns = [
  {
    label: "PEOPLE",
    items: [
      { icon: Users, iconBg: BLUE, title: "Zoiko HR", desc: "Records, onboarding, lifecycle" },
      { icon: Clock, iconBg: BLUE, title: "ZoikoTime", desc: "Time, attendance, schedules" },
      { icon: DollarSign, iconBg: BLUE, title: "Zoiko Payroll", desc: "Controlled pay runs" },
    ],
  },
  {
    label: "MONEY",
    items: [
      { icon: Grid3x3, iconBg: ORANGE, title: "Zoiko Billing", desc: "Invoices, subscriptions, revenue" },
      { icon: ArrowLeftRight, iconBg: ORANGE, title: "Zoiko Spend", desc: "Procurement, POs, vendor AP" },
    ],
    secondLabel: "WORK + SUPPLY",
    secondItems: [
      { icon: LayoutGrid, iconBg: ICON_BRIGHT_BLUE, title: "Zoiko Projects", desc: "Delivery, budgets, margin" },
      { icon: Hexagon, iconBg: BLUE, title: "Zoiko Inventory", desc: "Stock, receiving, reorder" },
    ],
  },
  {
    label: "CONTROL",
    items: [
      { icon: CheckCircle2, iconBg: ICON_NAVY, title: "Zoiko Comply", desc: "Obligations, evidence, audit" },
      { icon: BarChart3, iconBg: ICON_NAVY, title: "Zoiko Insights", desc: "Dashboards, risk, forecasts" },
    ],
    secondLabel: "PREMIUM CAPABILITY",
    secondItems: [
      { icon: SquareDot, iconBg: ORANGE_DARK, title: "Zoiko Docs Pro", desc: "Jurisdiction-aware documents" },
    ],
  },
];

function ProductRow({ icon: Icon, iconBg, title, desc }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        padding: "10px 8px",
        borderRadius: 10,
        cursor: "pointer",
        transition: "background .15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FA")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={21} color="#fff" strokeWidth={2.2} />
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16.5, color: NAVY, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: BODY, lineHeight: 1.45 }}>{desc}</div>
      </div>
    </div>
  );
}

function ColumnLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 800,
        color: LABEL_GRAY,
        letterSpacing: "0.08em",
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

export default function ProductsNavDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#fff", minHeight: 480, position: "relative" }}>
      {/* Trigger — hover to open */}
      <div
        style={{ padding: "28px 40px 0" }}
        onMouseEnter={() => setOpen(true)}
      >
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 19,
            fontWeight: 800,
            color: NAVY,
            padding: 0,
          }}
        >
          Products
          <ChevronDown
            size={20}
            color={NAVY}
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform .2s ease",
            }}
          />
        </button>
      </div>

      {/* Dropdown panel — hover away to close */}
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          style={{
            margin: "24px 40px 0",
            background: "#fff",
            border: `1px solid ${BORDER}`,
            borderRadius: 20,
            boxShadow: "0 24px 60px rgba(20,25,50,0.12)",
            padding: "36px 40px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 48,
          }}
        >
          {columns.map((col) => (
            <div key={col.label}>
              <ColumnLabel>{col.label}</ColumnLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: col.secondLabel ? 28 : 0 }}>
                {col.items.map((item) => (
                  <ProductRow key={item.title} {...item} />
                ))}
              </div>

              {col.secondLabel && (
                <>
                  <ColumnLabel>{col.secondLabel}</ColumnLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {col.secondItems.map((item) => (
                      <ProductRow key={item.title} {...item} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
