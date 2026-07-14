import { Printer, Download, FileText } from "lucide-react";
import { formatDisplayCurrency, formatDisplayDate } from "../../../utils/billing-helpers";
import React from "react";

export default function InvoicePDFPreview({
  form,
  lineItems = [],
  totals = {},
  orgSettings = {},
  customerName = "",
  billingAddress = "",
  shippingAddress = "",
}) {
  const orgName = orgSettings.organization_name || orgSettings.company_name || "Your Company";
  const orgAddress = orgSettings.address || orgSettings.company_address || "";
  const orgEmail = orgSettings.email || orgSettings.contact_email || "";
  const orgPhone = orgSettings.phone || orgSettings.contact_phone || "";
  const orgLogo = orgSettings.logo_url || null;
  const currency = form.currency || "USD";
  const invoiceNumber = form.invoice_number || (orgSettings?.auto_generate_invoice_number ? "Auto-generated on save" : "Draft Invoice");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Invoice Preview</h3>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
        >
          <Printer size={14} />
          Print
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-none">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">INVOICE</h1>
              <p className="text-violet-100 text-sm mt-1">
                {invoiceNumber}
              </p>
            </div>
            {orgLogo ? (
              <img src={orgLogo} alt={orgName} className="h-12 w-auto object-contain" />
            ) : (
              <div className="text-right text-white">
                <p className="font-bold text-lg">{orgName}</p>
                {orgAddress && <p className="text-violet-100 text-xs mt-0.5">{orgAddress}</p>}
                {orgEmail && <p className="text-violet-100 text-xs">{orgEmail}</p>}
                {orgPhone && <p className="text-violet-100 text-xs">{orgPhone}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bill To</p>
              <p className="text-sm font-bold text-slate-800">{customerName || "—"}</p>
              {billingAddress && (
                <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{billingAddress}</p>
              )}
            </div>
            <div className="text-right">
              <div className="space-y-1">
                <div className="flex justify-end text-xs">
                  <span className="text-slate-500 w-24">Invoice Date:</span>
                  <span className="font-medium text-slate-700 w-32 text-right">
                    {form.issue_date ? formatDisplayDate(form.issue_date) : "—"}
                  </span>
                </div>
                <div className="flex justify-end text-xs">
                  <span className="text-slate-500 w-24">Due Date:</span>
                  <span className="font-medium text-slate-700 w-32 text-right">
                    {form.due_date ? formatDisplayDate(form.due_date) : "—"}
                  </span>
                </div>
                <div className="flex justify-end text-xs">
                  <span className="text-slate-500 w-24">Terms:</span>
                  <span className="font-medium text-slate-700 w-32 text-right">
                    {form.payment_terms?.replace(/_/g, " ") || "—"}
                  </span>
                </div>
                {form.po_number && (
                  <div className="flex justify-end text-xs">
                    <span className="text-slate-500 w-24">PO Number:</span>
                    <span className="font-medium text-slate-700 w-32 text-right">{form.po_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {shippingAddress && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ship To</p>
              <p className="text-xs text-slate-600 whitespace-pre-line">{shippingAddress}</p>
            </div>
          )}

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Rate</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Tax %</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                      No line items added
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item, idx) => {
                    const qty = Number(item.quantity) || 0;
                    const rate = Number(item.unit_price) || 0;
                    const taxPct = Number(item.tax_percentage) || 0;
                    const lineTotal = Number(item.total) || 0;
                    return (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="py-2.5">
                          <p className="font-medium text-slate-800">{item.description || `Item ${idx + 1}`}</p>
                          {item.sku && <p className="text-xs text-slate-400 mt-0.5">SKU: {item.sku}</p>}
                        </td>
                        <td className="py-2.5 text-right text-xs text-slate-600">{qty}</td>
                        <td className="py-2.5 text-right text-xs text-slate-600">
                          {formatDisplayCurrency(rate, "—", currency)}
                        </td>
                        <td className="py-2.5 text-right text-xs text-slate-600">
                          {taxPct > 0 ? `${taxPct}%` : "—"}
                        </td>
                        <td className="py-2.5 text-right text-xs font-medium text-slate-800">
                          {formatDisplayCurrency(lineTotal, "—", currency)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-700">{formatDisplayCurrency(totals.subtotal || 0, "—", currency)}</span>
              </div>
              {(totals.discount || 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-medium text-red-600">-{formatDisplayCurrency(totals.discount, "—", currency)}</span>
                </div>
              )}
              {(totals.tax || 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Tax</span>
                  <span className="font-medium text-slate-700">{formatDisplayCurrency(totals.tax, "—", currency)}</span>
                </div>
              )}
              {(totals.shipping || 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Shipping</span>
                  <span className="font-medium text-slate-700">{formatDisplayCurrency(totals.shipping, "—", currency)}</span>
                </div>
              )}
              {(totals.roundOff || 0) !== 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Round Off</span>
                  <span className="font-medium text-slate-700">{formatDisplayCurrency(totals.roundOff, "—", currency)}</span>
                </div>
              )}
              <div className="border-t-2 border-slate-200 pt-2 flex justify-between">
                <span className="font-bold text-slate-800">Total</span>
                <span className="font-bold text-lg text-violet-600">
                  {formatDisplayCurrency(totals.grandTotal || 0, "—", currency)}
                </span>
              </div>
              <div className="text-right text-xs text-slate-400 mt-1">
                {currency}
              </div>
              {lineItems.some(item => item.exchange_rate && item.original_currency && item.original_currency !== currency) && (
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Exchange Rate Info</div>
                  {(() => {
                    const firstConverted = lineItems.find(item => item.exchange_rate && item.original_currency && item.original_currency !== currency);
                    return firstConverted ? (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Source</span>
                          <span className="text-slate-600">{firstConverted.exchange_rate_source || 'ExchangeRate-API'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Rate ({firstConverted.original_currency}/{currency})</span>
                          <span className="text-slate-600">{firstConverted.exchange_rate?.toFixed(6)}</span>
                        </div>
                        {firstConverted.exchange_rate_timestamp && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Fetched</span>
                            <span className="text-slate-600">{new Date(firstConverted.exchange_rate_timestamp).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>

          {form.notes && (
            <div className="mt-8 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-xs text-slate-600 whitespace-pre-line">{form.notes}</p>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">Generated by {orgName} — Zoiko Billing</p>
          </div>
        </div>
      </div>
    </div>
  );
}
