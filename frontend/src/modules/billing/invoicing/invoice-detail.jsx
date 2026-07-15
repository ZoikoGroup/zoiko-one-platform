import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, RefreshCw, AlertCircle, Loader2, Send, CheckCircle, Ban, Repeat, Printer, Copy, CreditCard, Undo2, DollarSign, Mail } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { invoiceApi } from "../../../service/billingService";
import { formatDisplayCurrency, formatDisplayDate } from "../../../utils/billing-helpers";

function StatusBadge({ status }) {
  const styles = {
    draft: "bg-gray-100 text-gray-600",
    pending: "bg-blue-100 text-blue-700",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
    partially_paid: "bg-amber-100 text-amber-700",
    cancelled: "bg-slate-100 text-slate-500",
    void: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ") : "Unknown"}
    </span>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invData, itemsData, historyData] = await Promise.all([
        invoiceApi.get(id),
        invoiceApi.listItems(id).catch(() => { /* error logged by api layer */ return []; }),
        invoiceApi.listStatusHistory(id).catch(() => { /* error logged by api layer */ return []; }),
      ]);
      setInvoice(invData);
      setItems(Array.isArray(itemsData) ? itemsData : itemsData?.items || []);
      setStatusHistory(Array.isArray(historyData) ? historyData : historyData?.history || []);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const handleAction = async (action, actionFn) => {
    setActionLoading(action);
    try {
      await actionFn();
      await fetchInvoice();
    } catch (err) {
      setError(err?.detail || err?.message || `Failed to ${action} invoice`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async () => {
    if (!invoice?.customer_id) return;
    setActionLoading("duplicate");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const dueDate = invoice.due_date && invoice.issue_date
        ? new Date(Date.now() + Math.max(0, new Date(invoice.due_date) - new Date(invoice.issue_date))).toISOString().slice(0, 10)
        : today;
      const created = await invoiceApi.create({
        customer_id: Number(invoice.customer_id),
        issue_date: today,
        due_date: dueDate,
        currency: invoice.currency || "USD",
        notes: invoice.notes || undefined,
        payment_terms: invoice.payment_terms || "net_30",
        po_number: invoice.po_number || undefined,
        discount_percentage: Number(invoice.discount_percentage || 0),
      });
      const newId = created.id || created.invoice_id;
      if (items.length > 0) {
        await invoiceApi.bulkSetItems(newId, items.map((item) => ({
          product_id: item.product_id || undefined,
          description: item.description || item.name || "Item",
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || 0),
          discount_percentage: Number(item.discount_percentage || 0),
          tax_percentage: Number(item.tax_percentage || 0),
          total: Number(item.total_price || item.total || 0),
        })));
      }
      navigate(`/billing/invoices/${newId}`);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to duplicate invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = async () => {
    setActionLoading("send-email");
    setSendResult(null);
    try {
      const result = await invoiceApi.sendEmail(id);
      setSendResult(result);
      await fetchInvoice();
    } catch (err) {
      setSendResult({ error: err?.detail || err?.message || "Failed to send invoice email" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <HRPage title="Invoice Detail" subtitle="Loading invoice details...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </HRPage>
    );
  }

  if (error && !invoice) {
    return (
      <HRPage title="Invoice Detail" subtitle="Error loading invoice">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={fetchInvoice} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </HRPage>
    );
  }

  if (!invoice) {
    return (
      <HRPage title="Invoice Detail" subtitle="Invoice not found">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Invoice not found</p>
        </div>
      </HRPage>
    );
  }

  const isDraft = invoice.status === "draft";
  const isPending = invoice.status === "pending" || invoice.status === "sent";
  const invoiceTotal = Number(invoice.total_amount ?? invoice.amount ?? 0);
  const balanceDue = Number(invoice.balance_due ?? invoice.amount_due ?? 0);
  const paidAmount = Math.max(0, invoiceTotal - balanceDue);
  const currency = invoice.currency || "USD";

  return (
    <HRPage
      title={`Invoice ${invoice.invoice_number || `#${id}`}`}
      subtitle={<StatusBadge status={invoice.status} />}
      actions={
        <button onClick={() => navigate("/billing/invoices")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      }
    >
      <div className="space-y-6">

        {/* ── HEADER: Summary + Quick Actions ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Invoice Summary</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">{invoice.customer_name || `Customer #${invoice.customer_id || "—"}`}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {invoice.invoice_number || `#${id}`} &middot; {currency} &middot; {invoice.payment_terms?.replace(/_/g, " ") || "standard terms"} &middot; issued {formatDisplayDate(invoice.issue_date || invoice.created_at)}
                </p>
                {invoice.po_number && <p className="mt-0.5 text-xs text-gray-400">PO: {invoice.po_number}</p>}
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Subtotal</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{formatDisplayCurrency(invoice.subtotal || 0, "\u2014", currency)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Tax</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatDisplayCurrency(invoice.tax_amount || 0, "\u2014", currency)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Total</p>
                <p className="mt-1 text-lg font-bold text-violet-700">{formatDisplayCurrency(invoice.total_amount ?? invoice.amount, "\u2014", currency)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-xs font-medium text-emerald-600">Paid</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">{formatDisplayCurrency(paidAmount, "\u2014", currency)}</p>
                {invoice.paid_at && <p className="text-xs text-emerald-500 mt-0.5">{formatDisplayDate(invoice.paid_at)}</p>}
              </div>
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-600">Balance Due</p>
                <p className="mt-1 text-lg font-bold text-amber-700">{formatDisplayCurrency(balanceDue, "\u2014", currency)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Due Date</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{formatDisplayDate(invoice.due_date)}</p>
                {invoice.sent_at && <p className="text-xs text-slate-400 mt-0.5">Sent: {formatDisplayDate(invoice.sent_at)}</p>}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Actions</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                <Printer className="h-3.5 w-3.5" /> PDF
              </button>
              <button onClick={handleDuplicate} disabled={actionLoading === "duplicate"} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {actionLoading === "duplicate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />} Duplicate
              </button>
              <button onClick={() => navigate(`/billing/payments?invoice_id=${id}`)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                <CreditCard className="h-3.5 w-3.5" /> Payment
              </button>
              <button onClick={() => navigate(`/billing/credit-notes?invoice_id=${id}`)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                <Undo2 className="h-3.5 w-3.5" /> Credit
              </button>
              {isPending && (
                <button onClick={() => handleAction("send", () => invoiceApi.markSent(id))} disabled={actionLoading === "send"} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Mark Sent
                </button>
              )}
              {(isDraft || isPending) && (
                <button onClick={() => setShowSendModal(true)} disabled={actionLoading === "send-email"} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-2 text-xs font-medium text-white hover:shadow-lg disabled:opacity-50">
                  {actionLoading === "send-email" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Send via Email
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── CUSTOMER INFORMATION ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{invoice.customer_name || invoice.customer_display_name || invoice.customer_company_name || "—"}</p>
                {(invoice.customer_first_name || invoice.customer_last_name) && (
                  <p className="text-xs text-gray-500">{invoice.customer_first_name || ""} {invoice.customer_last_name || ""}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                <p className="text-sm text-gray-900 mt-0.5">{invoice.customer_email || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
                <p className="text-sm text-gray-900 mt-0.5">{invoice.customer_phone || invoice.customer_mobile || "—"}</p>
              </div>
              {(invoice.customer_gst_number || invoice.customer_vat_number || invoice.customer_pan || invoice.customer_tax_id) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tax IDs</p>
                  {invoice.customer_gst_number && <p className="text-sm text-gray-900 mt-0.5">GST: {invoice.customer_gst_number}</p>}
                  {invoice.customer_vat_number && <p className="text-sm text-gray-900">VAT: {invoice.customer_vat_number}</p>}
                  {invoice.customer_pan && <p className="text-sm text-gray-900">PAN: {invoice.customer_pan}</p>}
                  {invoice.customer_tax_id && <p className="text-sm text-gray-900">{invoice.customer_tax_id_type || "Tax"}: {invoice.customer_tax_id}</p>}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Address</p>
                <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-line">{invoice.customer_billing_address || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping Address</p>
                <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-line">{invoice.customer_shipping_address || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {invoice.customer_credit_days != null && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Days</p>
                    <p className="text-sm text-gray-900 mt-0.5">{invoice.customer_credit_days} days</p>
                  </div>
                )}
                {invoice.customer_payment_terms && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Terms</p>
                    <p className="text-sm text-gray-900 mt-0.5">{invoice.customer_payment_terms.replace(/_/g, " ")}</p>
                  </div>
                )}
                {invoice.customer_currency && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Currency</p>
                    <p className="text-sm text-gray-900 mt-0.5">{invoice.customer_currency}</p>
                  </div>
                )}
                {invoice.customer_credit_limit != null && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Limit</p>
                    <p className="text-sm text-gray-900 mt-0.5">{formatDisplayCurrency(invoice.customer_credit_limit, "\u2014", currency)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── FINANCIAL SUMMARY ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Tax Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tax Amount</span>
                <span className="font-medium">{formatDisplayCurrency(invoice.tax_amount || 0, "\u2014", currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax %</span>
                <span className="font-medium">—</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="font-semibold text-gray-700">Total Tax</span>
                <span className="font-bold text-gray-900">{formatDisplayCurrency(invoice.tax_amount || 0, "\u2014", currency)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Discount Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Discount %</span>
                <span className="font-medium">{invoice.discount_percentage || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Discount Amount</span>
                <span className="font-medium text-red-600">-{formatDisplayCurrency(invoice.discount_amount || 0, "\u2014", currency)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="font-semibold text-gray-700">Total Discount</span>
                <span className="font-bold text-red-600">-{formatDisplayCurrency(invoice.discount_amount || 0, "\u2014", currency)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Total</span>
                <span className="font-medium">{formatDisplayCurrency(invoice.total_amount ?? invoice.amount, "\u2014", currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid Amount</span>
                <span className="font-medium text-emerald-600">{formatDisplayCurrency(paidAmount, "\u2014", currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Balance Due</span>
                <span className="font-bold text-amber-700">{formatDisplayCurrency(balanceDue, "\u2014", currency)}</span>
              </div>
              {invoice.paid_at && (
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-xs text-gray-400">Paid on {formatDisplayDate(invoice.paid_at)}</p>
                </div>
              )}
              {invoice.cancelled_at && (
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-xs text-red-400">Cancelled on {formatDisplayDate(invoice.cancelled_at)}</p>
                  {invoice.cancellation_reason && <p className="text-xs text-gray-400">Reason: {invoice.cancellation_reason}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CURRENCY & EXCHANGE RATE ── */}
        {(invoice.exchange_rate && invoice.exchange_rate != 1) || invoice.currency ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Currency Information</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Currency</p>
                <p className="text-gray-900 mt-0.5 font-medium">{currency}</p>
              </div>
              {invoice.customer_currency && invoice.customer_currency !== currency && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Currency</p>
                  <p className="text-gray-900 mt-0.5">{invoice.customer_currency}</p>
                </div>
              )}
              {!(invoice.exchange_rate == null || invoice.exchange_rate == 1) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Exchange Rate</p>
                  <p className="text-gray-900 mt-0.5 font-mono">{Number(invoice.exchange_rate).toFixed(6)}</p>
                </div>
              )}
              {invoice.subtotal && invoice.total_amount && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</p>
                  <p className="text-gray-900 mt-0.5">{formatDisplayCurrency(invoice.subtotal, "\u2014", currency)}</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ── LINE ITEMS ── */}
        {items.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-3 px-4">#</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-right py-3 px-4">Qty</th>
                    <th className="text-right py-3 px-4">Unit Price</th>
                    <th className="text-right py-3 px-4">Disc %</th>
                    <th className="text-right py-3 px-4">Tax %</th>
                    <th className="text-right py-3 px-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={item.id || i} className="text-sm text-gray-900">
                      <td className="py-3 px-4 text-gray-400">{i + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{item.description || item.name || "Item"}</p>
                        {item.product_id && <p className="text-xs text-gray-400">Product #{item.product_id}</p>}
                      </td>
                      <td className="py-3 px-4 text-right">{Number(item.quantity).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">{formatDisplayCurrency(item.unit_price, "\u2014", item.invoice_currency || currency)}</td>
                      <td className="py-3 px-4 text-right">{item.discount_percentage ? `${Number(item.discount_percentage).toFixed(1)}%` : "—"}</td>
                      <td className="py-3 px-4 text-right">{item.tax_percentage ? `${Number(item.tax_percentage).toFixed(1)}%` : "—"}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatDisplayCurrency(item.total ?? item.total_price ?? item.quantity * item.unit_price, "\u2014", item.invoice_currency || currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {items.some(i => i.original_currency && i.invoice_currency && i.original_currency !== i.invoice_currency) && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Currency Conversion Details</p>
                <div className="space-y-1.5 text-xs text-amber-800">
                  {items.filter(i => i.original_currency && i.invoice_currency && i.original_currency !== i.invoice_currency).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-medium">{item.description || `Item ${idx + 1}`}:</span>
                      <span>{item.original_currency} {formatDisplayCurrency(item.original_amount || item.unit_price, "\u2014", item.original_currency)}</span>
                      <span>× {Number(item.exchange_rate || 1).toFixed(6)}</span>
                      <span>= {item.invoice_currency} {formatDisplayCurrency(item.converted_amount || item.unit_price, "\u2014", item.invoice_currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NOTES ── */}
        {invoice.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Notes</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* ── STATUS ACTIONS ── */}
        {(isDraft || isPending) && (
          <div className="flex gap-3">
            {isDraft && (
              <button
                onClick={() => handleAction("finalize", () => invoiceApi.finalize(id))}
                disabled={actionLoading === "finalize"}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "finalize" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Finalize
              </button>
            )}
            {isPending && (
              <button
                onClick={() => handleAction("send", () => invoiceApi.markSent(id))}
                disabled={actionLoading === "send"}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Mark Sent
              </button>
            )}
            <button
              onClick={() => handleAction("cancel", () => invoiceApi.cancel(id))}
              disabled={actionLoading === "cancel"}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Cancel
            </button>
            <button
              onClick={() => handleAction("recalculate", () => invoiceApi.recalculate(id))}
              disabled={actionLoading === "recalculate"}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading === "recalculate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}
              Recalculate
            </button>
          </div>
        )}

        {/* ── STATUS TIMELINE ── */}
        {statusHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Timeline</h3>
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {[...statusHistory].reverse().map((entry, i) => (
                  <div key={entry.id || i} className="relative flex items-start gap-4 pl-10">
                    <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 mt-1.5 ${
                      entry.to_status === "paid" ? "bg-emerald-400 border-emerald-400" :
                      entry.to_status === "sent" ? "bg-blue-400 border-blue-400" :
                      entry.to_status === "overdue" ? "bg-red-400 border-red-400" :
                      entry.to_status === "cancelled" ? "bg-gray-400 border-gray-400" :
                      "bg-violet-400 border-violet-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">
                          {entry.from_status ? (
                            <>{entry.from_status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</>
                          ) : "System"}
                        </span>
                        <span className="text-gray-300 text-xs">→</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.to_status === "paid" ? "bg-emerald-100 text-emerald-700" :
                          entry.to_status === "sent" ? "bg-blue-100 text-blue-700" :
                          entry.to_status === "overdue" ? "bg-red-100 text-red-700" :
                          entry.to_status === "cancelled" ? "bg-gray-100 text-gray-500" :
                          "bg-violet-100 text-violet-700"
                        }`}>
                          {entry.to_status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDisplayDate(entry.created_at || entry.timestamp)}
                        {entry.reason ? ` · ${entry.reason}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {sendResult && !sendResult.error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-white rounded-2xl shadow-2xl border border-emerald-200 p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Invoice Sent</p>
              <p className="text-xs text-gray-500 mt-1">{sendResult.message || `Emailed to ${sendResult.email_sent_to || "customer"}`}</p>
            </div>
            <button onClick={() => setSendResult(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
        </div>
      )}

      {sendResult && sendResult.error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-white rounded-2xl shadow-2xl border border-red-200 p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Failed to Send</p>
              <p className="text-xs text-gray-500 mt-1">{sendResult.error}</p>
            </div>
            <button onClick={() => setSendResult(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowSendModal(false); setSendResult(null); }}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-violet-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Send Invoice via Email</h2>
            </div>

            {sendResult && sendResult.error ? (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={16} />{sendResult.error}
              </div>
            ) : sendResult && !sendResult.error ? (
              <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                <CheckCircle size={16} />{sendResult.message || "Invoice sent successfully"}
              </div>
            ) : null}

            {!sendResult && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  This will email invoice <strong>{invoice.invoice_number || `#${id}`}</strong> to the customer's registered email address.
                </p>
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Customer:</span>
                    <span className="font-medium text-gray-900">{invoice.customer_name || `#${invoice.customer_id}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="text-gray-500">Amount:</span>
                    <span className="font-medium text-gray-900">{formatDisplayCurrency(invoice.total_amount ?? invoice.amount, "\u2014", currency)}</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowSendModal(false); setSendResult(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                {sendResult ? "Close" : "Cancel"}
              </button>
              {!sendResult && (
                <button
                  onClick={handleSendEmail}
                  disabled={actionLoading === "send-email"}
                  className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {actionLoading === "send-email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {actionLoading === "send-email" ? "Sending..." : "Send Invoice"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </HRPage>
  );
}
