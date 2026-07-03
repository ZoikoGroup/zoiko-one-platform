export default function ZoikoSpendModule() {
  const metrics = [
    { label: "Total Spend (MTD)", value: "$84,200", change: "+5%", color: "#059669" },
    { label: "Pending Approvals", value: "12", change: "+3", color: "#D97706" },
    { label: "Vendor Records", value: "24", change: "+2", color: "#4F46E5" },
    { label: "Open POs & Requests", value: "12", change: "-3", color: "#DC2626" },
  ];

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>Zoiko Spend</h1>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>Dashboard overview — vendor records, purchase requests, purchase orders, supplier invoices, spend policies, approvals, and payment-ready workflows.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>{m.label}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <p style={{ fontSize: "28px", fontWeight: "800", color: m.color, margin: 0 }}>{m.value}</p>
              <span style={{ fontSize: "13px", fontWeight: "600", color: m.change.startsWith("+") ? "#059669" : "#DC2626" }}>{m.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={{ padding: "24px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: "0 0 16px 0" }}>Recent Purchase Orders</h3>
          {[
            { id: "PO-004", vendor: "CloudBase SA", amount: "$12,400", status: "Approved" },
            { id: "PO-003", vendor: "DataFlow Corp", amount: "$8,200", status: "Pending" },
            { id: "PO-005", vendor: "NexGen Systems", amount: "$24,000", status: "Draft" },
          ].map((po) => (
            <div key={po.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid #F3F4F6" }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>{po.id}</p>
                <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>{po.vendor}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: 0 }}>{po.amount}</p>
                <span style={{
                  fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "999px",
                  color: po.status === "Approved" ? "#059669" : po.status === "Pending" ? "#D97706" : "#6B7280",
                  background: po.status === "Approved" ? "#ECFDF5" : po.status === "Pending" ? "#FFFBEB" : "#F9FAFB",
                }}>{po.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "24px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: "0 0 16px 0" }}>Pending AP Approvals</h3>
          {[
            { vendor: "BridgeCo", invoice: "SI-003", amount: "$9,200", due: "Jun 20" },
            { vendor: "GreenPath Ltd.", invoice: "SI-002", amount: "$4,800", due: "Jun 25" },
            { vendor: "TechNova Inc.", invoice: "SI-005", amount: "$6,750", due: "Jul 1" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid #F3F4F6" }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>{a.vendor}</p>
                <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>{a.invoice} — due {a.due}</p>
              </div>
              <p style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: 0 }}>{a.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
