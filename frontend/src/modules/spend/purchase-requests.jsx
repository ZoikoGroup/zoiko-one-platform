const requests = [
  { id: "PR-001", requester: "Alice K.", vendor: "Stark Industries", items: "Manufacturing equipment", amount: "$45,000.00", date: "2026-06-17", priority: "High", status: "Pending" },
  { id: "PR-002", requester: "Bob M.", vendor: "Oscorp Ltd.", items: "Lab supplies", amount: "$3,200.00", date: "2026-06-18", priority: "Low", status: "Pending" },
  { id: "PR-003", requester: "Sarah M.", vendor: "TechNova Inc.", items: "Network hardware", amount: "$8,900.00", date: "2026-06-19", priority: "Medium", status: "Draft" },
  { id: "PR-004", requester: "John D.", vendor: "BridgeCo", items: "Print materials", amount: "$2,100.00", date: "2026-06-20", priority: "Low", status: "Approved" },
  { id: "PR-005", requester: "Alice K.", vendor: "DataFlow Corp", items: "Analytics subscription", amount: "$18,600.00", date: "2026-06-21", priority: "High", status: "Pending" },
  { id: "PR-006", requester: "Tom R.", vendor: "CloudBase SA", items: "DevOps tools renewal", amount: "$9,800.00", date: "2026-06-22", priority: "Medium", status: "Draft" },
  { id: "PR-007", requester: "Sarah M.", vendor: "GreenPath Ltd.", items: "Office furniture", amount: "$6,500.00", date: "2026-06-23", priority: "Low", status: "Pending" },
  { id: "PR-008", requester: "John D.", vendor: "NexGen Systems", items: "Consulting engagement", amount: "$24,000.00", date: "2026-06-24", priority: "High", status: "Approved" },
];

const priorityColor = (p) =>
  p === "High" ? "#DC2626" : p === "Medium" ? "#D97706" : "#6B7280";

const statusColor = (s) =>
  s === "Approved" ? "#059669" : s === "Pending" ? "#D97706" : "#6B7280";

export default function PurchaseRequestsPage() {
  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>Purchase Requests</h1>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>Submit, track and approve purchase requests across the organization.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Total Requests", value: "8", color: "#4F46E5" },
          { label: "Approved", value: "$26,100", color: "#059669" },
          { label: "Pending", value: "$56,700", color: "#D97706" },
          { label: "High Priority", value: "3", color: "#DC2626" },
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
              {["Request", "Requester", "Vendor", "Items", "Amount", "Date", "Priority", "Status"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((pr) => (
              <tr key={pr.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{pr.id}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{pr.requester}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{pr.vendor}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{pr.items}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{pr.amount}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6B7280" }}>{pr.date}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px",
                    color: priorityColor(pr.priority), background: `${priorityColor(pr.priority)}15`,
                  }}>{pr.priority}</span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px",
                    color: statusColor(pr.status), background: `${statusColor(pr.status)}15`,
                  }}>{pr.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
