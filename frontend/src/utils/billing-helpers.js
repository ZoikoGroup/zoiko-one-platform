import { formatCurrency as localeFormatCurrency } from "./locale";

export function extractArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (data.monthly_revenue && Array.isArray(data.monthly_revenue)) return data.monthly_revenue;
  if (data.monthly_revenue && data.monthly_revenue.monthly_revenue && Array.isArray(data.monthly_revenue.monthly_revenue)) return data.monthly_revenue.monthly_revenue;
  if (data["0_30"] !== undefined) {
    const labels = {
      "0_30": "0-30 Days",
      "31_60": "31-60 Days",
      "61_90": "61-90 Days",
      "91_plus": "90+ Days"
    };
    return ["0_30", "31_60", "61_90", "91_plus"].map(k => ({
      name: labels[k] || k,
      bucket: labels[k] || k,
      amount: parseFloat(data[k]?.total || 0),
      total_amount: parseFloat(data[k]?.total || 0),
      total: parseFloat(data[k]?.total || 0),
      count: data[k]?.count || 0
    }));
  }
  return [];
}

export function formatDisplayCurrency(v, fallback = "\u2014") {
  if (v == null || v === "") return fallback;
  const num = Number(v);
  if (Number.isNaN(num)) return fallback;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDisplayDate(d) {
  return d ? new Date(d).toLocaleDateString() : "\u2014";
}
