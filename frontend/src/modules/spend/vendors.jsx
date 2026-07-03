const vendors = [
  { id: "VEN-001", name: "TechNova Inc.", category: "IT Services", contact: "sarah@technova.io", spend: "$124,500", status: "Active" },
  { id: "VEN-002", name: "GreenPath Ltd.", category: "Office Supplies", contact: "james@greenpath.com", spend: "$28,400", status: "Active" },
  { id: "VEN-003", name: "DataFlow Corp", category: "Software", contact: "ops@dataflow.io", spend: "$67,200", status: "Active" },
  { id: "VEN-004", name: "CloudBase SA", category: "Cloud Infrastructure", contact: "billing@cloudbase.io", spend: "$89,600", status: "Active" },
  { id: "VEN-005", name: "NexGen Systems", category: "Consulting", contact: "engage@nexgen.dev", spend: "$156,000", status: "Active" },
  { id: "VEN-006", name: "BridgeCo", category: "Marketing", contact: "hello@bridgeco.co", spend: "$42,300", status: "On Hold" },
  { id: "VEN-007", name: "Stark Industries", category: "Manufacturing", contact: "procure@stark.com", spend: "$312,000", status: "Active" },
  { id: "VEN-008", name: "Oscorp Ltd.", category: "Research", contact: "vendor@oscorp.net", spend: "$18,900", status: "Inactive" },
];

const statusColor = (s) =>
  s === "Active" ? "#059669" : s === "On Hold" ? "#D97706" : "#6B7280";

export default function VendorsPage() {
  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>Vendors</h1>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>Manage vendor records, contracts, classifications, and performance across the procurement lifecycle.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Total Vendors", value: "8", color: "#4F46E5" },
          { label: "Active", value: "6", color: "#059669" },
          { label: "Total Spend (YTD)", value: "$838,900", color: "#D97706" },
          { label: "Avg Payment Terms", value: "30d", color: "#6B7280" },
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
              {["Vendor ID", "Name", "Category", "Contact", "Total Spend", "Status"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{v.id}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{v.name}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{v.category}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#4F46E5" }}>{v.contact}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{v.spend}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px",
                    color: statusColor(v.status), background: `${statusColor(v.status)}15`,
                  }}>{v.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
