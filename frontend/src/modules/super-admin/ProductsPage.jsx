import { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import { AlertTriangle, Package, CheckCircle, XCircle, RefreshCw, Building2, ToggleLeft, ToggleRight } from "lucide-react";
import { superAdminService } from "../../service/superAdminService";

export default function SuperAdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [orgProducts, setOrgProducts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [orgSearch, setOrgSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      loadOrgProducts(selectedOrgId);
    }
  }, [selectedOrgId]);

  const loadData = async () => {
    try {
      setError(null);
      const [prods, orgs] = await Promise.all([
        superAdminService.getProducts(),
        superAdminService.getOrganizations({ page: 1, page_size: 100 }),
      ]);
      setProducts(prods || []);
      setOrganizations(orgs.organizations || []);
    } catch (e) {
      console.error("Failed to load products", e);
      setError(e.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  const loadOrgProducts = async (orgId) => {
    try {
      const data = await superAdminService.getOrganizationProducts(orgId);
      setOrgProducts(data || []);
    } catch (e) {
      console.error("Failed to load org products", e);
    }
  };

  const handleToggle = async (productId, currentlyEnabled) => {
    if (!selectedOrgId) return;
    try {
      await superAdminService.toggleOrganizationProduct(selectedOrgId, productId, !currentlyEnabled);
      loadOrgProducts(selectedOrgId);
    } catch (e) {
      console.error("Failed to toggle product", e);
    }
  };

  const handleStatusToggle = async (productId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await superAdminService.updateProductStatus(productId, newStatus);
      loadData();
    } catch (e) {
      console.error("Failed to update product status", e);
    }
  };

  const filteredOrgs = organizations.filter(o =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase())
  );

  if (loading) return <div className="text-center py-12 text-slate-400 font-sans">Loading...</div>;

  return (
    <div className="space-y-6 font-sans">
      <PageHeader title="Products" description="Manage Zoiko products and their enablement across organizations." />

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-red-600 underline hover:text-red-800 text-xs font-semibold">Retry</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Products List */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Zoiko Products</h3>
          {products.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              No products found
            </div>
          ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-[#FF7A00]">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{p.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                    p.status === "maintenance" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                    "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}>
                    {p.status}
                  </span>
                  <button
                    onClick={() => handleStatusToggle(p.id, p.status)}
                    className="p-1.5 hover:bg-white rounded-lg transition text-slate-400 hover:text-[#FF7A00]"
                    title="Toggle Status"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Per-Organization Product Enablement */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Organization Product Access</h3>

          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search organizations..."
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm text-slate-800 outline-none focus:border-[#FF7A00]"
            />
          </div>

          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm text-slate-700 outline-none focus:border-[#FF7A00] mb-4"
          >
            <option value="">Select an organization</option>
            {filteredOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>

          {selectedOrgId ? (
            <div className="space-y-2">
              {products.map((p) => {
                const orgProd = orgProducts.find(op => op.product_id === p.id);
                const isEnabled = orgProd?.is_enabled ?? false;
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">{p.name}</span>
                    </div>
                    <button
                      onClick={() => handleToggle(p.id, isEnabled)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        isEnabled
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {isEnabled ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      {isEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Select an organization to manage product access
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
