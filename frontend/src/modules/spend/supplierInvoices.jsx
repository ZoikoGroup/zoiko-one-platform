const supplierInvoices = [
  { id: "SI-001", vendor: "TechNova Inc.", poRef: "PO-001", amount: "$15,200.00", date: "2026-06-05", dueDate: "2026-07-05", status: "Approved" },
  { id: "SI-002", vendor: "GreenPath Ltd.", poRef: "PO-002", amount: "$2,400.00", date: "2026-06-07", dueDate: "2026-07-07", status: "Pending" },
  { id: "SI-003", vendor: "BridgeCo", poRef: "PO-006", amount: "$5,600.00", date: "2026-06-10", dueDate: "2026-07-10", status: "Pending" },
  { id: "SI-004", vendor: "CloudBase SA", poRef: "PO-004", amount: "$12,400.00", date: "2026-06-12", dueDate: "2026-07-12", status: "Approved" },
  { id: "SI-005", vendor: "TechNova Inc.", poRef: "-", amount: "$6,750.00", date: "2026-06-14", dueDate: "2026-07-14", status: "Under Review" },
  { id: "SI-006", vendor: "DataFlow Corp", poRef: "PO-003", amount: "$8,200.00", date: "2026-06-15", dueDate: "2026-07-15", status: "Paid" },
  { id: "SI-007", vendor: "NexGen Systems", poRef: "PO-005", amount: "$24,000.00", date: "2026-06-16", dueDate: "2026-07-16", status: "Disputed" },
  { id: "SI-008", vendor: "CloudBase SA", poRef: "-", amount: "$3,800.00", date: "2026-06-18", dueDate: "2026-07-18", status: "Pending" },
  { id: "SI-009", vendor: "DataFlow Corp", poRef: "-", amount: "$18,600.00", date: "2026-06-19", dueDate: "2026-07-19", status: "Under Review" },
  { id: "SI-010", vendor: "Stark Industries", poRef: "-", amount: "$45,000.00", date: "2026-06-20", dueDate: "2026-07-20", status: "Pending" },
];

const statusColor = (s) =>
  s === "Approved" || s === "Paid" ? "#059669" : s === "Pending" ? "#D97706" : s === "Under Review" ? "#4F46E5" : "#DC2626";

export default function SupplierInvoicesPage() {
  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>Supplier Invoices</h1>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>Receive, validate, and process supplier invoices against purchase orders with policy checks and approval routing.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Total Invoices", value: "10", color: "#4F46E5" },
          { label: "Approved/Paid", value: "$35,800", color: "#059669" },
          { label: "Pending Review", value: "$106,350", color: "#D97706" },
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
              {["Invoice #", "Vendor", "PO Ref", "Amount", "Date", "Due Date", "Status"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontSize: "12px", fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {supplierInvoices.map((si) => (
              <tr key={si.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{si.id}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{si.vendor}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{si.poRef}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>{si.amount}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6B7280" }}>{si.date}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#6B7280" }}>{si.dueDate}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "999px",
                    color: statusColor(si.status), background: `${statusColor(si.status)}15`,
                  }}>{si.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
