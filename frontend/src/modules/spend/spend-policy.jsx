const policies = [
  { id: "POL-001", name: "Travel & Expense Policy", category: "Travel", description: "Airfare, lodging, meals and incidental expense limits", lastReview: "2026-05-01", status: "Active" },
  { id: "POL-002", name: "Procurement Approval Thresholds", category: "Procurement", description: "Approval limits by role and spend band", lastReview: "2026-04-15", status: "Active" },
  { id: "POL-003", name: "Vendor Selection Criteria", category: "Vendor", description: "Minimum qualifications, RFx requirements and due diligence", lastReview: "2026-03-20", status: "Active" },
  { id: "POL-004", name: "Contract Spending Limits", category: "Contract", description: "Maximum contract value without executive approval", lastReview: "2026-06-01", status: "Under Review" },
  { id: "POL-005", name: "Software Licensing Policy", category: "IT", description: "Software procurement, renewal and compliance guidelines", lastReview: "2026-02-10", status: "Active" },
  { id: "POL-006", name: "Capital Expenditure Policy", category: "Finance", description: "CapEx vs OpEx classification and authorization", lastReview: "2026-01-05", status: "Active" },
  { id: "POL-007", name: "Petty Cash Management", category: "Finance", description: "Petty cash limits, reconciliation and reporting", lastReview: "2025-12-01", status: "Inactive" },
  { id: "POL-008", name: "Supplier Diversity Policy", category: "Vendor", description: "Diversity spend targets and reporting requirements", lastReview: "2026-06-10", status: "Draft" },
];

const statusColor = (s) =>
  s === "Active" ? "#059669" : s === "Under Review" ? "#D97706" : s === "Draft" ? "#4F46E5" : "#6B7280";

export default function SpendPolicyPage() {
  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>Spend Policy</h1>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>Define, manage and enforce procurement and spending policies across the organization.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Total Policies", value: "8", color: "#4F46E5" },
          { label: "Active", value: "5", color: "#059669" },
          { label: "Under Review", value: "1", color: "#D97706" },
          { label: "Draft / Inactive", value: "2", color: "#6B7280" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
            <p style={{ fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>{s.label}</p>
            <p style={{ fontSize: "28px", fontWeight: "800", color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
        <div style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: "0 0 12px 0" }}>Policies by Category</h3>
          {[
            { category: "Finance", count: 2 },
            { category: "Vendor", count: 2 },
            { category: "Travel", count: 1 },
            { category: "Procurement", count: 1 },
            { category: "Contract", count: 1 },
            { category: "IT", count: 1 },
          ].map((pc) => (
            <div key={pc.category} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #F3F4F6", fontSize: "13px" }}>
              <span style={{ color: "#374151" }}>{pc.category}</span>
              <span style={{ fontWeight: "600", color: "#4F46E5" }}>{pc.count} policy{pc.count > 1 ? "ies" : "y"}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px", borderRadius: "12px", background: "white", border: "1.5px solid #E5E7EB" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: "0 0 12px 0" }}>Needs Attention</h3>
          {[
            { name: "Contract Spending Limits", days: 15, issue: "Review pending" },
            { name: "Petty Cash Management", days: 197, issue: "Last reviewed 2025" },
            { name: "Supplier Diversity Policy", days: 0, issue: "Draft — not published" },
          ].map((na, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #F3F4F6", fontSize: "13px" }}>
              <div>
                <p style={{ margin: 0, color: "#374151", fontWeight: "500" }}>{na.name}</p>
                <p style={{ margin: 0, color: "#6B7280", fontSize: "12px" }}>{na.issue}</p>
              </div>
              <span style={{ color: na.days > 90 ? "#DC2626" : "#D97706", fontWeight: "600", fontSize: "12px", whiteSpace: "nowrap" }}>
                {na.days > 0 ? `${na.days}d overdue` : "Action needed"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", textAlign: "left" }}>
              {["Policy", "Name", "Category", "Description", "Last Reviewed", "Status"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {policies.map((pol) => (
              <tr key={pol.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{pol.id}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{pol.name}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{pol.category}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6B7280" }}>{pol.description}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6B7280" }}>{pol.lastReview}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px",
                    color: statusColor(pol.status), background: `${statusColor(pol.status)}15`,
                  }}>{pol.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
