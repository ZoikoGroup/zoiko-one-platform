/**
 * workspace/workspace-format.js
 * ------------------------------
 * Data-integrity helpers for the Billing Admin "MY ORGANIZATION" workspace.
 * These exist so the workspace NEVER guesses at display values:
 *
 *   * Currency        — read ONLY from BillingConfiguration.default_currency.
 *                       No hardcoded fallback (no "USD"/"GBP"). When the
 *                       configuration carries no currency, callers display
 *                       "Currency Not Configured".
 *   * Money           — formatted through the shared formatDisplayCurrency
 *                       engine, but always with an explicit configured
 *                       currency so it never falls back to the Billing
 *                       product's guessed base currency.
 *   * Organization    — name shown with correct casing (never raw lowercase).
 *   * Fiscal year     — "MM-DD" config values turned into "FY 2026–27" and
 *                       "1 Apr – 31 Mar 2027" labels.
 */

import { formatDisplayCurrency } from "../../../utils/billing-helpers";
import { getCurrencySymbol } from "../../../utils/currency";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const ACRONYM_TOKENS = new Set([
  "Ltd", "Ltd.", "LLP", "LLC", "Inc", "Inc.", "Co", "Co.", "GmbH",
  "PLC", "Pvt", "Pvt.", "L.L.C", "S.A.", "SA", "AG", "BV", "NV",
  "LLC", "Corp", "Corp.", "L.L.P",
]);

/**
 * Resolve the organization's configured display currency. Source of truth is
 * BillingConfiguration.default_currency. Returns null when unconfigured so
 * callers can render "Currency Not Configured".
 */
export function resolveOrgCurrency(config) {
  const raw = config?.default_currency;
  if (!raw) return null;
  const code = String(raw).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

/**
 * Format a monetary value in the organization's configured currency. Returns
 * "—" when the value is missing or when no currency is configured (we never
 * guess a currency to render money).
 */
export function formatOrgMoney(value, config) {
  const currency = resolveOrgCurrency(config);
  if (!currency) return "\u2014";
  return formatDisplayCurrency(value, currency);
}

/**
 * Human-friendly currency chip label, e.g. "₹ INR" or "Currency Not
 * Configured".
 */
export function formatCurrencyChip(config) {
  const currency = resolveOrgCurrency(config);
  if (!currency) return "Currency Not Configured";
  return `${getCurrencySymbol(currency)} ${currency}`;
}

/**
 * Normalize an organization name for display. Keeps already-properly-cased
 * names untouched; title-cases all-lowercase input while preserving common
 * business-suffix casing (Pvt. Ltd., LLP, GmbH, ...).
 */
export function normalizeOrgName(name) {
  if (!name || typeof name !== "string") return name || "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (/[A-Z]/.test(trimmed.slice(1))) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      const token = word.replace(/[^A-Za-z]/g, "");
      if (ACRONYM_TOKENS.has(token)) {
        return token === word ? token : `${token}${word.slice(token.length)}`;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function parseMmDd(value) {
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

function formatDateLabel({ month, day }) {
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

/**
 * "FY 2026–27" label derived from the config's fiscal_year_start/end.
 * The financial year is the period beginning on fiscal_year_start that
 * contains today's date.
 */
export function formatFiscalYearLabel(start, end) {
  const s = parseMmDd(start);
  const e = parseMmDd(end);
  if (!s || !e) return null;
  const now = new Date();
  const startsThisYear = new Date(now.getFullYear(), s.month - 1, s.day);
  const startYear = now >= startsThisYear ? now.getFullYear() : now.getFullYear() - 1;
  return `FY ${startYear}\u2013${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/**
 * "1 Apr – 31 Mar 2027" range label derived from fiscal_year_start/end.
 */
export function formatFiscalYearRange(start, end) {
  const s = parseMmDd(start);
  const e = parseMmDd(end);
  if (!s || !e) return null;
  const now = new Date();
  const startsThisYear = new Date(now.getFullYear(), s.month - 1, s.day);
  const startYear = now >= startsThisYear ? now.getFullYear() : now.getFullYear() - 1;
  return `${formatDateLabel(s)} ${startYear} \u2013 ${formatDateLabel(e)} ${startYear + 1}`;
}
