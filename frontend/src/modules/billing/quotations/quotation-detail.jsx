import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileSignature, RefreshCw, AlertCircle, Loader2, Send,
  CheckCircle, XCircle, Ban, RotateCcw, FileText, DollarSign,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { quoteApi, invoiceApi } from "../../../service/billingService";
import { formatDisplayCurrency, formatDisplayDate } from "../../../utils/billing-helpers";

function StatusBadge({ status }) {
  const styles = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-500",
    converted: "bg-violet-100 text-violet-700",
    expired: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </span>
  );
}

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertForm, setConvertForm] = useState({
    invoice_number: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qData, itemsData] = await Promise.all([
        quoteApi.get(id),
        quoteApi.listItems(id).catch(() => { /* error logged by api layer */ return []; }),
      ]);
      setQuote(qData);
      setItems(Array.isArray(itemsData) ? itemsData : itemsData?.items || []);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  async function handleAction(action) {
    try {
      setActionLoading(action);
      setError(null);
      switch (action) {
        case "send":
          await quoteApi.send(id);
          break;
        case "accept":
          await quoteApi.accept(id);
          break;
        case "cancel":
          await quoteApi.cancel(id);
          break;
        case "recalculate":
          await quoteApi.recalculate(id);
          break;
      }
      await fetchQuote();
    } catch (err) {
      setError(err?.detail || err?.message || `Failed to ${action} quotation`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    try {
      setActionLoading("reject");
      setError(null);
      await quoteApi.reject(id, rejectReason.trim());
      setShowRejectModal(false);
      setRejectReason("");
      await fetchQuote();
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to reject quotation");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConvert() {
    if (!convertForm.invoice_number || !convertForm.issue_date || !convertForm.due_date) return;
    try {
      setActionLoading("convert");
      setError(null);
      await quoteApi.convertToInvoice(id, convertForm);
      setShowConvertModal(false);
      await fetchQuote();
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to convert quotation");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <HRPage title="Quotation Detail" subtitle="Loading quotation details...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </HRPage>
    );
  }

  if (error && !quote) {
    return (
      <HRPage title="Quotation Detail" subtitle="Error loading quotation">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={fetchQuote} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </HRPage>
    );
  }

  if (!quote) {
    return (
      <HRPage title="Quotation Detail" subtitle="Quotation not found">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileSignature className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Quotation not found</p>
        </div>
      </HRPage>
    );
  }

  const btnClass = "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50";
  const isActing = (a) => actionLoading === a;

  return (
    <HRPage
      title={`Quotation ${quote.quote_number || `#${id}`}`}
      subtitle={`Status: ${quote.status || "Unknown"}${quote.quote_version > 1 ? ` · v${quote.quote_version}` : ""}`}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/billing/quotations")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</p>
            <div className="mt-2"><StatusBadge status={quote.status} /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatDisplayCurrency(quote.total_amount, quote.currency || "USD")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Valid Until</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatDisplayDate(quote.valid_until)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Items</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{items.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quotation Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
                  <p className="text-gray-900 mt-0.5">{quote.customer_name || `Customer #${quote.customer_id}`}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
                  <p className="text-gray-900 mt-0.5">{formatDisplayDate(quote.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</p>
                  <p className="text-gray-900 mt-0.5">{formatDisplayDate(quote.valid_until)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Version</p>
                  <p className="text-gray-900 mt-0.5">v{quote.quote_version || 1}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</p>
                  <p className="text-gray-900 mt-0.5">{formatDisplayCurrency(quote.subtotal, quote.currency || "USD")}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</p>
                  <p className="text-gray-900 mt-0.5">
                    {parseFloat(quote.discount_percentage || 0) > 0 ? `${quote.discount_percentage}%` : "—"}
                    {parseFloat(quote.discount_amount || 0) > 0 && ` (${formatDisplayCurrency(quote.discount_amount, quote.currency || "USD")})`}
                  </p>
                </div>
                {quote.subject && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</p>
                    <p className="text-gray-900 mt-0.5">{quote.subject}</p>
                  </div>
                )}
              </div>
            </div>

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
                        <th className="text-right py-3 px-4">Discount</th>
                        <th className="text-right py-3 px-4">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, i) => (
                        <tr key={item.id || i} className="text-sm text-gray-900">
                          <td className="py-3 px-4 text-gray-400">{item.line_number || i + 1}</td>
                          <td className="py-3 px-4">{item.description || "Item"}</td>
                          <td className="py-3 px-4 text-right">{parseFloat(item.quantity).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right">{formatDisplayCurrency(item.unit_price, quote.currency || "USD")}</td>
                          <td className="py-3 px-4 text-right text-gray-500">
                            {parseFloat(item.discount_percentage || 0) > 0 ? `${item.discount_percentage}%` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">{formatDisplayCurrency(item.total_amount, quote.currency || "USD")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="text-sm font-medium">
                        <td colSpan={5} className="py-3 px-4 text-right text-gray-600">Subtotal</td>
                        <td className="py-3 px-4 text-right">{formatDisplayCurrency(quote.subtotal, quote.currency || "USD")}</td>
                      </tr>
                      {parseFloat(quote.discount_amount || 0) > 0 && (
                        <tr className="text-sm text-gray-500">
                          <td colSpan={5} className="py-2 px-4 text-right">Discount</td>
                          <td className="py-2 px-4 text-right">-{formatDisplayCurrency(quote.discount_amount, quote.currency || "USD")}</td>
                        </tr>
                      )}
                      {parseFloat(quote.tax_amount || 0) > 0 && (
                        <tr className="text-sm text-gray-500">
                          <td colSpan={5} className="py-2 px-4 text-right">Tax</td>
                          <td className="py-2 px-4 text-right">{formatDisplayCurrency(quote.tax_amount, quote.currency || "USD")}</td>
                        </tr>
                      )}
                      <tr className="text-sm font-bold text-gray-900 border-t border-gray-200">
                        <td colSpan={5} className="py-3 px-4 text-right">Total</td>
                        <td className="py-3 px-4 text-right">{formatDisplayCurrency(quote.total_amount, quote.currency || "USD")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">

                {quote.status === "draft" && (
                  <>
                    <button onClick={() => handleAction("send")} disabled={isActing("send")}
                      className={`${btnClass} w-full text-white bg-violet-600 hover:bg-violet-700`}>
                      {isActing("send") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send Quotation
                    </button>
                    <button onClick={() => handleAction("recalculate")} disabled={isActing("recalculate")}
                      className={`${btnClass} w-full text-gray-700 bg-gray-100 hover:bg-gray-200`}>
                      {isActing("recalculate") ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Recalculate
                    </button>
                    <button onClick={() => handleAction("cancel")} disabled={isActing("cancel")}
                      className={`${btnClass} w-full text-red-700 bg-red-50 hover:bg-red-100`}>
                      {isActing("cancel") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                      Cancel Quotation
                    </button>
                  </>
                )}

                {quote.status === "sent" && (
                  <>
                    <button onClick={() => handleAction("accept")} disabled={isActing("accept")}
                      className={`${btnClass} w-full text-white bg-emerald-600 hover:bg-emerald-700`}>
                      {isActing("accept") ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Accept Quotation
                    </button>
                    <button onClick={() => setShowRejectModal(true)} disabled={isActing("reject")}
                      className={`${btnClass} w-full text-red-700 bg-red-50 hover:bg-red-100`}>
                      <XCircle className="h-4 w-4" />
                      Reject Quotation
                    </button>
                  </>
                )}

                {quote.status === "accepted" && (
                  <button onClick={() => setShowConvertModal(true)} disabled={isActing("convert")}
                    className={`${btnClass} w-full text-white bg-violet-600 hover:bg-violet-700`}>
                    {isActing("convert") ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Convert to Invoice
                  </button>
                )}

                {quote.converted_to_invoice_id && (
                  <button onClick={() => navigate(`/billing/invoices/${quote.converted_to_invoice_id}`)}
                    className={`${btnClass} w-full text-violet-700 bg-violet-50 hover:bg-violet-100`}>
                    <DollarSign className="h-4 w-4" />
                    View Invoice #{quote.converted_to_invoice_id}
                  </button>
                )}

                {quote.rejected_reason && (
                  <div className="p-3 rounded-lg bg-red-50 text-sm">
                    <p className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">Rejection Reason</p>
                    <p className="text-red-600">{quote.rejected_reason}</p>
                  </div>
                )}

                {quote.notes && (
                  <div className="p-3 rounded-lg bg-gray-50 text-sm">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                )}

                {quote.terms && (
                  <div className="p-3 rounded-lg bg-gray-50 text-sm">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Terms</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{quote.terms}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {quote.status === "draft" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            This quotation is in draft status. Send it to the customer for review.
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Quotation</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason for rejecting this quotation.</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              rows={3} placeholder="Reason for rejection..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || isActing("reject")}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {isActing("reject") ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowConvertModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Convert to Invoice</h3>
            <p className="text-sm text-gray-500 mb-4">Create an invoice from this accepted quotation.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Number</label>
                <input type="text" value={convertForm.invoice_number}
                  onChange={(e) => setConvertForm((f) => ({ ...f, invoice_number: e.target.value }))}
                  placeholder="INV-0001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Issue Date</label>
                <input type="date" value={convertForm.issue_date}
                  onChange={(e) => setConvertForm((f) => ({ ...f, issue_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                <input type="date" value={convertForm.due_date}
                  onChange={(e) => setConvertForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleConvert}
                disabled={!convertForm.invoice_number || !convertForm.issue_date || !convertForm.due_date || isActing("convert")}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">
                {isActing("convert") ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Convert
              </button>
            </div>
          </div>
        </div>
      )}
    </HRPage>
  );
}
