import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Plus, X, Building2, Search, AlertCircle, Pencil } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { getDepartments, createDepartment, updateDepartment } from "../../../service/hrService";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/zoiko-hr/departments" },
  { label: "Department List", href: "/zoiko-hr/departments/list" },
  { label: "Department Structure", href: "/zoiko-hr/departments/structure" },
  { label: "Reports", href: "/zoiko-hr/departments/reports" },
  { label: "Settings", href: "/zoiko-hr/departments/settings" },
];

function SubNav() {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-100">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} to={item.href} end={item.href === "/zoiko-hr/departments"}
          className={({ isActive }) =>
            `whitespace-nowrap px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              isActive ? "text-rose-600 border-b-2 border-rose-600 bg-rose-50/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`
          }>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

export default function DepartmentList() {
  const [records, setRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // Track backend duplicate errors
  const [editingDept, setEditingDept] = useState(null); // null = creating, object = editing

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    head: "",
    establishment_year: "",
    budget: "",
    spent_budget: "",
    description: "",
    parent_id: ""
  });

  const fetchRecords = () => {
    setIsLoading(true);
    getDepartments()
      .then((res) => {
        const data = res?.data?.data || res?.data || res || [];
        setRecords(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const emptyForm = {
    name: "",
    code: "",
    head: "",
    establishment_year: "",
    budget: "",
    spent_budget: "",
    description: "",
    parent_id: ""
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage(""); // Reset errors before submitting

    // The Parent Entity <select> stores "" when no parent is chosen, and a
    // string id otherwise. Pydantic's Optional[int] can't parse "", so we
    // convert it to a real null/number here before sending.
    const payload = {
      ...formData,
      parent_id: formData.parent_id === "" ? null : Number(formData.parent_id),
      establishment_year: formData.establishment_year === "" ? null : Number(formData.establishment_year),
      budget: formData.budget === "" ? 0 : Number(formData.budget),
      spent_budget: formData.spent_budget === "" ? 0 : Number(formData.spent_budget),
    };

    const action = editingDept
      ? updateDepartment(editingDept.id, payload)
      : createDepartment(payload);

    action
      .then(() => {
        setIsModalOpen(false);
        setEditingDept(null);
        setFormData(emptyForm);
        fetchRecords();
      })
      .catch((err) => {
        // Catch 409 conflict or any other error message sent from server response
        const fallbackMsg = "Department with this name or code already exists.";
        const apiError = err?.response?.data?.message || err?.response?.data?.error || err?.message || fallbackMsg;
        setErrorMessage(apiError);
        console.error(err);
      });
  };

  const handleEditClick = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name || "",
      code: dept.code || "",
      head: dept.head || "",
      establishment_year: dept.establishment_year || "",
      budget: dept.budget || "",
      spent_budget: dept.spent_budget || "",
      description: dept.description || "",
      parent_id: dept.parent_id || ""
    });
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingDept(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDept(null);
    setErrorMessage("");
  };

  const filteredRecords = records.filter(r => 
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <HRPage title="Departments" subtitle="Manage organizational entities">
      <SubNav />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input type="text" placeholder="Search departments..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-rose-500" />
          </div>
          <button onClick={handleOpenCreateModal} className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Plus size={16} /> Add Department
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Head</th>
                <th className="px-6 py-3">Est. Year</th>
                <th className="px-6 py-3">Budget Allocation</th>
                <th className="px-6 py-3">Spent Budget</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading department lines...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No matching entries found.</td></tr>
              ) : (
                filteredRecords.map((r, i) => (
                  <tr key={r.id ?? i} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-rose-600">{r.code}</td>
                    <td className="px-6 py-3">{r.head || "-"}</td>
                    <td className="px-6 py-3">{r.establishment_year || "-"}</td>
                    <td className="px-6 py-3">${(Number(r.budget) || 0).toLocaleString()}</td>
                    <td className="px-6 py-3">${(Number(r.spent_budget) || 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => handleEditClick(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors">
                        <Pencil size={13} /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal View Component */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={18} className="text-rose-600" /> {editingDept ? "Edit Department" : "Create New Department"}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-sm flex-1">
              
              {/* Error Banner Injection point */}
              {errorMessage && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium animate-shake">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>{errorMessage}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Department Name *</label>
                  <input type="text" required placeholder="e.g., Human Resources" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Department Code *</label>
                  <input type="text" required placeholder="e.g., HR" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-rose-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Department Head *</label>
                  <input type="text" required placeholder="e.g., Jane Doe" value={formData.head} onChange={(e) => setFormData({...formData, head: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Establishment Year *</label>
                  <input type="number" required placeholder="e.g., 2024" value={formData.establishment_year} onChange={(e) => setFormData({...formData, establishment_year: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-rose-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Allocated Budget ($) *</label>
                  <input type="number" required placeholder="e.g., 1500000" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Spent Budget ($) *</label>
                  <input type="number" required placeholder="e.g., 250000" value={formData.spent_budget} onChange={(e) => setFormData({...formData, spent_budget: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-rose-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Parent Entity (Optional)</label>
                <select value={formData.parent_id} onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-rose-500">
                  <option value="">No Parent (Root Level)</option>
                  {records.filter(r => r.id !== editingDept?.id).map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                <textarea rows="2" placeholder="Optional structural details..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-rose-500 resize-none"></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-semibold text-gray-600 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-sm transition-colors">{editingDept ? "Save Changes" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HRPage>
  );
}