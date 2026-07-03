const payments = [
  { id: "PMT-001", vendor: "TechNova Inc.", invoice: "SI-001", amount: "$15,200.00", dueDate: "2026-07-05", method: "Wire Transfer", status: "Scheduled" },
  { id: "PMT-002", vendor: "GreenPath Ltd.", invoice: "SI-002", amount: "$2,400.00", dueDate: "2026-07-07", method: "ACH", status: "Scheduled" },
  { id: "PMT-003", vendor: "BridgeCo", invoice: "SI-003", amount: "$5,600.00", dueDate: "2026-07-10", method: "Check", status: "Pending Approval" },
  { id: "PMT-004", vendor: "CloudBase SA", invoice: "SI-004", amount: "$12,400.00", dueDate: "2026-07-12", method: "Wire Transfer", status: "Scheduled" },
  { id: "PMT-005", vendor: "TechNova Inc.", invoice: "SI-005", amount: "$6,750.00", dueDate: "2026-07-14", method: "ACH", status: "Pending Approval" },
  { id: "PMT-006", vendor: "DataFlow Corp", invoice: "SI-006", amount: "$8,200.00", dueDate: "2026-07-15", method: "Wire Transfer", status: "Ready" },
  { id: "PMT-007", vendor: "NexGen Systems", invoice: "SI-007", amount: "$24,000.00", dueDate: "2026-07-16", method: "Wire Transfer", status: "Disputed" },
  { id: "PMT-008", vendor: "CloudBase SA", invoice: "SI-008", amount: "$3,800.00", dueDate: "2026-07-18", method: "ACH", status: "Pending Approval" },
  { id: "PMT-009", vendor: "DataFlow Corp", invoice: "SI-009", amount: "$18,600.00", dueDate: "2026-07-19", method: "Wire Transfer", status: "Ready" },
  { id: "PMT-010", vendor: "Stark Industries", invoice: "SI-010", amount: "$45,000.00", dueDate: "2026-07-20", method: "Wire Transfer", status: "Pending Approval" },
];

const statusColor = (s) =>
  s === "Ready" ? "#059669" : s === "Scheduled" ? "#4F46E5" : s === "Pending Approval" ? "#D97706" : s === "Disputed" ? "#DC2626" : "#6B7280";

export default function PaymentPreparationPage() {
  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>Payment Preparation</h1>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>Review, approve and schedule payments to vendors. Manage payment methods and payment runs.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Total to Pay", value: "$141,950", color: "#4F46E5" },
          { label: "Ready to Pay", value: "$26,800", color: "#059669" },
          { label: "Scheduled", value: "$30,000", color: "#4F46E5" },
          { label: "Pending Approval", value: "$61,150", color: "#D97706" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>{s.label}</p>
            <p style={{ fontSize: "28px", fontWeight: "800", color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
        <div style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: "0 0 12px 0" }}>Payment Method Breakdown</h3>
          {[
            { method: "Wire Transfer", count: 6, total: "$123,400" },
            { method: "ACH", count: 3, total: "$12,950" },
            { method: "Check", count: 1, total: "$5,600" },
          ].map((pm) => (
            <div key={pm.method} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #F3F4F6", fontSize: "13px" }}>
              <span style={{ color: "#374151" }}>{pm.method}</span>
              <span style={{ color: "#6B7280" }}>{pm.count} payments</span>
              <span style={{ fontWeight: "600", color: "#111827" }}>{pm.total}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: "0 0 12px 0" }}>Upcoming Payment Run</h3>
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <p style={{ fontSize: "32px", fontWeight: "800", color: "#4F46E5", margin: "0 0 4px 0" }}>Jul 5, 2026</p>
            <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Next scheduled run — 4 payments totaling $30,000</p>
          </div>
          <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: "12px", fontSize: "13px" }}>
            {[
              { vendor: "TechNova Inc.", amount: "$15,200", method: "Wire" },
              { vendor: "GreenPath Ltd.", amount: "$2,400", method: "ACH" },
              { vendor: "CloudBase SA", amount: "$12,400", method: "Wire" },
            ].map((run, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ color: "#374151" }}>{run.vendor}</span>
                <span style={{ color: "#6B7280" }}>{run.method}</span>
                <span style={{ fontWeight: "600", color: "#111827" }}>{run.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", textAlign: "left" }}>
              {["Payment", "Vendor", "Invoice", "Amount", "Due Date", "Method", "Status"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((pmt) => (
              <tr key={pmt.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{pmt.id}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{pmt.vendor}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{pmt.invoice}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{pmt.amount}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6B7280" }}>{pmt.dueDate}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{pmt.method}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px",
                    color: statusColor(pmt.status), background: `${statusColor(pmt.status)}15`,
                  }}>{pmt.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
