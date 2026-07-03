import HRPage from '../../../components/HRPage';





export default function QuotationReportsPage() {
  return (
    <HRPage title="Quotation Reports" subtitle="Quotation analytics and reporting">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Quotations</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Avg Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">By Sales Rep</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Categories</h3>
          <p className="text-sm text-gray-500">Quotation performance and conversion reports.</p>
        </div>
      </div>
    </HRPage>
  );
}
