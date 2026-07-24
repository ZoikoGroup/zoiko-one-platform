import { formatCurrency as localeFormatCurrency } from "./locale";
import { getCurrencySymbol, CURRENCY_MASTER } from "./currency";
import { getOrgBaseCurrency } from "../modules/billing/utils/CurrencyContext";

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

export function formatDisplayCurrency(v, fallbackOrCurrency, currencyCode) {
  let fb = "\u2014";
  let cc = "";
  if (currencyCode) {
    fb = fallbackOrCurrency || "\u2014";
    cc = currencyCode;
  } else if (fallbackOrCurrency && /^[A-Z]{3}$/.test(fallbackOrCurrency)) {
    cc = fallbackOrCurrency;
  } else {
    fb = fallbackOrCurrency || "\u2014";
  }
  if (v == null || v === "") return fb;
  const num = Number(v);
  if (Number.isNaN(num)) return fb;
  const effectiveCurrency = cc || getOrgBaseCurrency();
  const symbol = getCurrencySymbol(effectiveCurrency);
  const info = CURRENCY_MASTER[effectiveCurrency];
  const precision = typeof info?.decimalDigits === "number" ? info.decimalDigits : 2;
  return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: precision, maximumFractionDigits: precision })}`;
}

export function formatCompactCurrency(v, currencyCode) {
  if (v === null || v === undefined) return `${getCurrencySymbol(currencyCode)}0.00`;
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return `${getCurrencySymbol(currencyCode)}0.00`;
  const symbol = getCurrencySymbol(currencyCode);
  const absNum = Math.abs(num);
  if (absNum >= 1e9) return `${symbol}${(num / 1e9).toFixed(2)}B`;
  if (absNum >= 1e6) return `${symbol}${(num / 1e6).toFixed(2)}M`;
  if (absNum >= 1e3) return `${symbol}${(num / 1e3).toFixed(2)}K`;
  return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDisplayDate(d) {
  if (d == null || d === "") return "\u2014";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString();
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
