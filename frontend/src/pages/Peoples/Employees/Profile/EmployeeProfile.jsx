import { useState, useEffect, useRef } from "react";
import {
  User, Briefcase, MapPin, Calendar, Mail, Phone, Building2,
  Clock, Users, ChevronRight, Shield, Loader2, AlertCircle
} from "lucide-react";
import { getMyProfile } from "../../../../service/employee";
import HRPage from "../../../../components/HRPage";

const TABS = ["Personal Details", "Work Details"];

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-50">
      <Icon size={15} className="text-indigo-500" />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 font-medium mt-0.5">{value || "—"}</p>
    </div>
  </div>
);

export default function EmployeeProfile() {
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);
    getMyProfile()
      .then((res) => {
        if (mounted.current) setProfile(res.data || res);
      })
      .catch((err) => {
        if (mounted.current) setError(err?.message || "Failed to load profile");
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => { mounted.current = false; };
  }, []);

  if (loading) {
    return (
      <HRPage title="Employee Profile" subtitle="Employees">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="ml-3 text-sm text-slate-500 font-medium">Loading profile...</span>
        </div>
      </HRPage>
    );
  }

  if (error) {
    return (
      <HRPage title="Employee Profile" subtitle="Employees">
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm font-semibold">
          <AlertCircle size={16} /> {error}
        </div>
      </HRPage>
    );
  }

  const p = profile || {};
  const initials = p.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?";

  return (
    <HRPage title="Employee Profile" subtitle="Employees">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg mb-4">
              <span className="text-3xl font-bold text-white">{initials}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">{p.fullName}</h2>
            <p className="text-sm text-indigo-600 font-medium mt-0.5">{p.designationName || p.title}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
              <Building2 size={12} /> {p.departmentName || p.department}
            </span>

            <div className="w-full mt-5 pt-5 border-t border-slate-100 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">Employee ID</span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{p.employeeCode || p.employeeId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">Joined</span>
                <span className="text-xs font-semibold text-slate-700">{p.dateOfJoining ? new Date(p.dateOfJoining).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
              </div>
            </div>
          </div>

          {/* Quick Emergency Contact */}
          {(() => { const ecs = p.emergencyContacts || p.emergency_contacts || []; return ecs.length > 0; })() && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-red-500" />
                <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Emergency Contact</span>
              </div>
              {(() => { const ecs = p.emergencyContacts || p.emergency_contacts || []; return ecs.filter((c) => c.isPrimary).slice(0, 1); })().map((ec) => (
                <div key={ec.id || ec._id}>
                  <p className="text-sm font-semibold text-slate-800">{ec.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{ec.relationship}</p>
                  <p className="text-xs text-slate-600 font-medium mt-1">{ec.primaryPhone}</p>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${
                  activeTab === i ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
                {activeTab === i && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 0 ? (
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <InfoRow icon={User} label="Full Name" value={p.fullName} />
                    <InfoRow icon={Mail} label="Personal Email" value={p.personalEmail} />
                    <InfoRow icon={Phone} label="Contact Number" value={p.phoneNumber || p.phone} />
                  </div>
                  <div>
                    <InfoRow icon={Calendar} label="Date of Birth" value={p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
                    <InfoRow icon={User} label="Gender" value={p.gender} />
                    <InfoRow icon={MapPin} label="Permanent Address" value={p.address} />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Work Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <InfoRow icon={Users} label="Reporting Manager" value={p.managerName || p.manager} />
                    <InfoRow icon={MapPin} label="Work Location" value={p.workLocation} />
                  </div>
                  <div>
                    <InfoRow icon={Briefcase} label="Employment Type" value={p.employmentType} />
                    <InfoRow icon={Clock} label="Shift Timing" value={p.shiftTiming} />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">Company Email</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{p.email || p.companyEmail}</p>
                  </div>
                  <ChevronRight size={16} className="text-indigo-300" />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </HRPage>
  );
}
