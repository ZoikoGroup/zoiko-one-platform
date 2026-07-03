const apItems = [
  { id: "AP-001", vendor: "TechNova Inc.", invoice: "SI-001", amount: "$15,200.00", received: "2026-06-05", due: "2026-07-05", stage: "Approved", assignee: "John D." },
  { id: "AP-002", vendor: "GreenPath Ltd.", invoice: "SI-002", amount: "$2,400.00", received: "2026-06-07", due: "2026-07-07", stage: "3-Way Match", assignee: "Sarah M." },
  { id: "AP-003", vendor: "BridgeCo", invoice: "SI-003", amount: "$5,600.00", received: "2026-06-10", due: "2026-07-10", stage: "Pending Approval", assignee: "—" },
  { id: "AP-004", vendor: "CloudBase SA", invoice: "SI-004", amount: "$12,400.00", received: "2026-06-12", due: "2026-07-12", stage: "Approved", assignee: "John D." },
  { id: "AP-005", vendor: "TechNova Inc.", invoice: "SI-005", amount: "$6,750.00", received: "2026-06-14", due: "2026-07-14", stage: "Review", assignee: "Alice K." },
  { id: "AP-006", vendor: "DataFlow Corp", invoice: "SI-006", amount: "$8,200.00", received: "2026-06-15", due: "2026-07-15", stage: "Scheduled", assignee: "—" },
  { id: "AP-007", vendor: "NexGen Systems", invoice: "SI-007", amount: "$24,000.00", received: "2026-06-16", due: "2026-07-16", stage: "Dispute", assignee: "Legal" },
  { id: "AP-008", vendor: "CloudBase SA", invoice: "SI-008", amount: "$3,800.00", received: "2026-06-18", due: "2026-07-18", stage: "Pending Approval", assignee: "—" },
  { id: "AP-009", vendor: "DataFlow Corp", invoice: "SI-009", amount: "$18,600.00", received: "2026-06-19", due: "2026-07-19", stage: "Review", assignee: "Alice K." },
  { id: "AP-010", vendor: "Stark Industries", invoice: "SI-010", amount: "$45,000.00", received: "2026-06-20", due: "2026-07-20", stage: "Pending Approval", assignee: "—" },
];

const stageColor = (s) =>
  s === "Approved" || s === "Scheduled" ? "#059669" : s === "3-Way Match" || s === "Review" ? "#4F46E5" : s === "Pending Approval" ? "#D97706" : "#DC2626";

export default function ApWorkflowPage() {
  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>AP Workflow</h1>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>End-to-end AP workflow — from invoice validation, policy enforcement, and approval routing to payment-ready scheduling.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Pending Approval", value: "$54,400", color: "#D97706" },
          { label: "In Review/Match", value: "$25,350", color: "#4F46E5" },
          { label: "Approved to Pay", value: "$27,600", color: "#059669" },
          { label: "Disputed", value: "$24,000", color: "#DC2626" },
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
              {["AP ID", "Vendor", "Invoice", "Amount", "Received", "Due", "Stage", "Assignee"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apItems.map((ap) => (
              <tr key={ap.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{ap.id}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{ap.vendor}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{ap.invoice}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{ap.amount}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6B7280" }}>{ap.received}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6B7280" }}>{ap.due}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px",
                    color: stageColor(ap.stage), background: `${stageColor(ap.stage)}15`,
                  }}>{ap.stage}</span>
                </td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{ap.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
