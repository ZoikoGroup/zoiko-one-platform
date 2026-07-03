import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileSignature, RefreshCw, AlertCircle, Loader2, Send, CheckCircle, XCircle, Ban, Repeat } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { quoteApi } from "../../../service/billingService";

const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "—";
const formatCurrency = (v) => v != null ? `$${Number(v).toLocaleString()}` : "—";

function StatusBadge({ status }) {
  const styles = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-500",
    converted: "bg-violet-100 text-violet-700",
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

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qData, itemsData] = await Promise.all([
        quoteApi.get(id),
        quoteApi.listItems(id).catch(() => []),
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

  if (loading) {
    return (
      <HRPage title="Quotation Detail" subtitle="Loading quotation details...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </HRPage>
    );
  }

  if (error) {
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

  return (
    <HRPage
      title={`Quotation ${quote.quote_number || `#${id}`}`}
      subtitle={`Status: ${quote.status || "Unknown"}`}
      actions={
        <button onClick={() => navigate("/billing/quotations")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</p>
            <div className="mt-2"><StatusBadge status={quote.status} /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(quote.total_amount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Valid Until</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatDate(quote.valid_until)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Items</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{items.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quotation Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
              <p className="text-gray-900 mt-0.5">{quote.customer_name || quote.customer_id || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
              <p className="text-gray-900 mt-0.5">{formatDate(quote.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</p>
              <p className="text-gray-900 mt-0.5">{formatDate(quote.expiry_date || quote.valid_until)}</p>
            </div>
            {quote.description && (
              <div className="col-span-full">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</p>
                <p className="text-gray-900 mt-0.5">{quote.description}</p>
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
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-right py-3 px-4">Qty</th>
                    <th className="text-right py-3 px-4">Unit Price</th>
                    <th className="text-right py-3 px-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={item.id || i} className="text-sm text-gray-900">
                      <td className="py-3 px-4">{item.description || item.name || "Item"}</td>
                      <td className="py-3 px-4 text-right">{item.quantity ?? 1}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.total_price ?? item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {quote.status === "draft" && (
          <div className="flex gap-3">
            <button onClick={() => quoteApi.send(id).then(fetchQuote)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
              <Send className="h-4 w-4" /> Send
            </button>
            <button onClick={() => quoteApi.cancel(id).then(fetchQuote)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Ban className="h-4 w-4" /> Cancel
            </button>
          </div>
        )}
      </div>
    </HRPage>
  );
}
