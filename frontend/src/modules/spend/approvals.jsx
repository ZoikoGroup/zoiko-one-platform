const approvalItems = [
  { id: "APPR-001", type: "Purchase Request", ref: "PR-001", requester: "Alice K.", amount: "$45,000.00", submitted: "2026-06-17", stage: "Manager", status: "Pending" },
  { id: "APPR-002", type: "Purchase Request", ref: "PR-002", requester: "Bob M.", amount: "$3,200.00", submitted: "2026-06-18", stage: "Manager", status: "Approved" },
  { id: "APPR-003", type: "Purchase Order", ref: "PO-003", requester: "Sarah M.", amount: "$8,200.00", submitted: "2026-06-15", stage: "Finance", status: "Pending" },
  { id: "APPR-004", type: "Supplier Invoice", ref: "SI-003", requester: "AP Auto", amount: "$5,600.00", submitted: "2026-06-16", stage: "3-Way Match", status: "Pending" },
  { id: "APPR-005", type: "Purchase Order", ref: "PO-006", requester: "John D.", amount: "$5,600.00", submitted: "2026-06-17", stage: "Manager", status: "Approved" },
  { id: "APPR-006", type: "Purchase Request", ref: "PR-005", requester: "Alice K.", amount: "$18,600.00", submitted: "2026-06-21", stage: "Director", status: "Pending" },
  { id: "APPR-007", type: "Supplier Invoice", ref: "SI-005", requester: "AP Auto", amount: "$6,750.00", submitted: "2026-06-18", stage: "Finance", status: "Pending" },
  { id: "APPR-008", type: "Purchase Request", ref: "PR-007", requester: "Sarah M.", amount: "$6,500.00", submitted: "2026-06-23", stage: "Manager", status: "Pending" },
  { id: "APPR-009", type: "Supplier Invoice", ref: "SI-008", requester: "AP Auto", amount: "$3,800.00", submitted: "2026-06-20", stage: "Pending Approval", status: "Pending" },
  { id: "APPR-010", type: "Supplier Invoice", ref: "SI-010", requester: "AP Auto", amount: "$45,000.00", submitted: "2026-06-22", stage: "Director", status: "Pending" },
];

const stageColor = (s) =>
  s === "Manager" ? "#4F46E5" : s === "Director" ? "#7C3AED" : s === "Finance" ? "#0891B2" : s === "3-Way Match" ? "#D97706" : s === "Pending Approval" ? "#6B7280" : "#059669";

const statusBadgeColor = (s) =>
  s === "Approved" ? "#059669" : "#D97706";

export default function SpendApprovalsPage() {
  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>Approvals</h1>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>Review and approve purchase requests, purchase orders and supplier invoices across approval stages.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Pending Approval", value: "7", color: "#D97706" },
          { label: "Pending Value", value: "$131,450", color: "#DC2626" },
          { label: "Approved (Today)", value: "$8,800", color: "#059669" },
          { label: "Avg Approval Time", value: "2.4d", color: "#4F46E5" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>{s.label}</p>
            <p style={{ fontSize: "28px", fontWeight: "800", color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
        <div style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: "0 0 12px 0" }}>By Approval Stage</h3>
          {[
            { stage: "Manager Review", count: 4, total: "$60,300" },
            { stage: "Director Review", count: 2, total: "$63,600" },
            { stage: "Finance Review", count: 2, total: "$14,950" },
            { stage: "3-Way Match", count: 1, total: "$5,600" },
            { stage: "Pending Assignment", count: 1, total: "$3,800" },
          ].map((as) => (
            <div key={as.stage} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #F3F4F6", fontSize: "13px" }}>
              <span style={{ color: "#374151" }}>{as.stage}</span>
              <span style={{ color: "#6B7280" }}>{as.count} items</span>
              <span style={{ fontWeight: "600", color: "#111827" }}>{as.total}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: "0 0 12px 0" }}>My Pending Approvals</h3>
          {[
            { ref: "PR-001", requester: "Alice K.", amount: "$45,000.00", type: "Purchase Request" },
            { ref: "PO-003", requester: "Sarah M.", amount: "$8,200.00", type: "Purchase Order" },
            { ref: "PR-005", requester: "Alice K.", amount: "$18,600.00", type: "Purchase Request" },
          ].map((my, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #F3F4F6", fontSize: "13px" }}>
              <div>
                <p style={{ margin: 0, color: "#374151", fontWeight: "500" }}>{my.ref}</p>
                <p style={{ margin: 0, color: "#6B7280", fontSize: "12px" }}>{my.type} — {my.requester}</p>
              </div>
              <p style={{ margin: 0, fontWeight: "600", color: "#111827" }}>{my.amount}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", textAlign: "left" }}>
              {["Approval", "Type", "Reference", "Requester", "Amount", "Submitted", "Stage", "Status"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {approvalItems.map((appr) => (
              <tr key={appr.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{appr.id}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{appr.type}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{appr.ref}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{appr.requester}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{appr.amount}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6B7280" }}>{appr.submitted}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px",
                    color: stageColor(appr.stage), background: `${stageColor(appr.stage)}15`,
                  }}>{appr.stage}</span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px",
                    color: statusBadgeColor(appr.status), background: `${statusBadgeColor(appr.status)}15`,
                  }}>{appr.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
