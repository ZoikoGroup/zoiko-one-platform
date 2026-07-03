import { useState, useEffect } from "react";
import { getTraining } from "../../service/complyService";
import { BookOpen, Users, CheckCircle, Clock } from "lucide-react";

// ==========================================
// INTERNAL MOCKED COMPONENTS (NO DEPENDENCIES)
// ==========================================

const DataTable = ({ columns = [], data = [] }) => (
  <div className="overflow-x-auto w-full border border-gray-100 rounded-lg">
    <table className="w-full text-left border-collapse text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
          {columns.map((col, idx) => (
            <th key={idx} className="p-3">{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data && data.length > 0 ? (
          data.map((row, rIdx) => (
            <tr key={rIdx} className="border-b border-gray-100 hover:bg-gray-50 text-gray-700">
              {columns.map((col, cIdx) => (
                <td key={cIdx} className="p-3">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length} className="p-8 text-center text-gray-400">
              No training history found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status).toLowerCase();
  const badgeStyles = {
    completed: "bg-green-50 text-green-700 border-green-100",
    in_progress: "bg-orange-50 text-orange-700 border-orange-100",
    not_started: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const style = badgeStyles[normalized] || "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${style}`}>
      {normalized.replace("_", " ")}
    </span>
  );
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
};

// ==========================================
// MAIN MODULE EXPORT
// ==========================================

export default function ComplianceTraining() {
  const [training, setTraining] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getTraining().then(setTraining).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading training...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Training</h1>
        <p className="text-sm text-gray-500 mt-1">Assign and track compliance training for employees</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Courses</p>
              <p className="text-lg font-bold text-gray-900">{training.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-lg font-bold text-gray-900">{training.filter(t => t.status === "completed").length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">In Progress</p>
              <p className="text-lg font-bold text-gray-900">{training.filter(t => t.status === "in_progress").length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Enrolled</p>
              <p className="text-lg font-bold text-gray-900">{training.reduce((sum, t) => sum + (t.enrolled || 0), 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <DataTable
          columns={[
            { key: "title", label: "Course", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
            { key: "type", label: "Type", render: (v) => <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">{v}</span> },
            { key: "enrolled", label: "Enrolled" },
            { key: "completionRate", label: "Completion", render: (v) => v ? <div className="flex items-center gap-2"><div className="w-16 h-2 bg-gray-200 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${v}%` }} /></div><span className="text-xs text-gray-500">{v}%</span></div> : "N/A" },
            { key: "dueDate", label: "Due Date", render: (v) => formatDate(v) },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
          ]}
          data={training}
        />
      </div>
    </div>
  );
}