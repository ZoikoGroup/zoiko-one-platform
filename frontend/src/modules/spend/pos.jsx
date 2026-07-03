const pos = [
  { id: "PO-001", vendor: "TechNova Inc.", items: "Server equipment", amount: "$15,200.00", date: "2026-06-01", status: "Approved" },
  { id: "PO-002", vendor: "GreenPath Ltd.", items: "Office supplies", amount: "$2,400.00", date: "2026-06-03", status: "Closed" },
  { id: "PO-003", vendor: "DataFlow Corp", items: "Software licenses", amount: "$8,200.00", date: "2026-06-08", status: "Pending" },
  { id: "PO-004", vendor: "CloudBase SA", items: "Cloud infrastructure", amount: "$12,400.00", date: "2026-06-10", status: "Approved" },
  { id: "PO-005", vendor: "NexGen Systems", items: "Consulting services", amount: "$24,000.00", date: "2026-06-12", status: "Draft" },
  { id: "PO-006", vendor: "BridgeCo", items: "Marketing materials", amount: "$5,600.00", date: "2026-06-14", status: "Pending" },
  { id: "PO-007", vendor: "CloudBase SA", items: "DevOps tools", amount: "$9,800.00", date: "2026-06-15", status: "Approved" },
  { id: "PO-008", vendor: "DataFlow Corp", items: "Data analytics suite", amount: "$18,600.00", date: "2026-06-16", status: "Draft" },
  { id: "PR-001", vendor: "Stark Industries", items: "Manufacturing equipment", amount: "$45,000.00", date: "2026-06-17", status: "Pending" },
  { id: "PR-002", vendor: "Oscorp Ltd.", items: "Lab supplies", amount: "$3,200.00", date: "2026-06-18", status: "Pending" },
  { id: "PR-003", vendor: "TechNova Inc.", items: "Network hardware", amount: "$8,900.00", date: "2026-06-19", status: "Draft" },
  { id: "PR-004", vendor: "BridgeCo", items: "Print materials", amount: "$2,100.00", date: "2026-06-20", status: "Approved" },
];

const statusColor = (s) =>
  s === "Approved" ? "#059669" : s === "Pending" ? "#D97706" : s === "Closed" ? "#6B7280" : "#4F46E5";

export default function PosPage() {
  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>Purchase Orders</h1>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>Create, approve and track purchase requests and purchase orders across your organization.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Total POs & Requests", value: "12", color: "#4F46E5" },
          { label: "Approved", value: "$59,500", color: "#059669" },
          { label: "Pending", value: "$59,000", color: "#D97706" },
          { label: "Draft", value: "$27,500", color: "#6B7280" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>{s.label}</p>
            <p style={{ fontSize: "28px", fontWeight: "800", color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", textAlign: "left" }}>
              {["ID", "Vendor", "Items", "Amount", "Date", "Status"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pos.map((po) => (
              <tr key={po.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{po.id}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{po.vendor}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{po.items}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{po.amount}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6B7280" }}>{po.date}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px",
                    color: statusColor(po.status), background: `${statusColor(po.status)}15`,
                  }}>{po.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
