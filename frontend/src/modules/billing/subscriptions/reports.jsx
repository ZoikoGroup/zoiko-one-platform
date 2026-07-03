import HRPage from '../../../components/HRPage';





export default function SubscriptionReportsPage() {
  return (
    <HRPage title="Subscription Reports" subtitle="Subscription analytics and reporting">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Subscriptions</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">MRR</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Churn Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">LTV</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Categories</h3>
          <p className="text-sm text-gray-500">Subscription performance and analytics reports.</p>
        </div>
      </div>
    </HRPage>
  );
}
