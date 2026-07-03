import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEmployeeById, getEmployeeProfile, getEmployeeLifecycle } from "../../../../service/employee";
import { getDesignations } from "../../../../service/hrService";
import HRPage from "../../../../components/HRPage";
import { ArrowLeft, Mail, Phone, Calendar, MapPin, Building, Briefcase, DollarSign, User, Shield, Award, BookOpen, Clock, ChevronRight, ExternalLink } from "lucide-react";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-red-100 text-red-800",
  on_leave: "bg-yellow-100 text-yellow-800",
  terminated: "bg-gray-100 text-gray-800",
  resigned: "bg-orange-100 text-orange-800",
};

const EMPLOYMENT_TYPE_LABELS = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  intern: "Intern",
  probation: "Probation",
};

const TABS = [
  { id: "overview", label: "Overview", icon: User },
  { id: "employment", label: "Employment", icon: Briefcase },
  { id: "profile", label: "Extended Profile", icon: Shield },
  { id: "lifecycle", label: "Lifecycle", icon: Clock },
];

function getInitials(first, last) {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-900">{value || <span className="text-gray-400 italic">Not set</span>}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-500" />}
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatBadge({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [manager, setManager] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lifecycle, setLifecycle] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const designationMap = useMemo(() => {
    const m = {};
    designations.forEach((d) => { m[d.id] = d; });
    return m;
  }, [designations]);

  const getDesignationName = (id) => {
    if (!id) return null;
    const d = designationMap[id];
    return d ? d.title || d.name || d.designation_name : `#${id}`;
  };
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const empResp = await getEmployeeById(id);
        if (!mounted) return;
        setEmployee(empResp);

        if (empResp.reporting_manager_id) {
          getEmployeeById(empResp.reporting_manager_id).then((mgr) => {
            if (mounted) setManager(mgr);
          }).catch(() => {});
        }
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load employee");
      }
    };

    const fetchProfile = async () => {
      try {
        const profResp = await getEmployeeProfile(id);
        if (mounted) setProfile(profResp);
      } catch (e) {
        // profile might not exist yet
      }
    };

    const fetchLifecycle = async () => {
      try {
        const lcResp = await getEmployeeLifecycle(id);
        if (mounted) setLifecycle(Array.isArray(lcResp) ? lcResp : lcResp?.items || []);
      } catch (e) {
        // lifecycle might not exist
      }
    };

    const fetchDesignationsList = async () => {
      try {
        const res = await getDesignations();
        if (mounted) setDesignations(Array.isArray(res) ? res : res?.data || res?.items || []);
      } catch { /* ignore */ }
    };

    Promise.all([fetchData(), fetchProfile(), fetchLifecycle(), fetchDesignationsList()]).finally(() => {
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <HRPage title="Employee Profile" subtitle="Loading employee details...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </HRPage>
    );
  }

  if (error || !employee) {
    return (
      <HRPage title="Employee Profile" subtitle="Error loading profile">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">{error || "Employee not found"}</p>
          <button onClick={() => navigate("/zoiko-hr/employee-management/employees")} className="mt-4 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            Back to Employees
          </button>
        </div>
      </HRPage>
    );
  }

  const deptName = employee.department?.name || (employee.department ? employee.department : null) || null;
  const managerName = manager ? `${manager.first_name} ${manager.last_name}` : null;

  return (
    <HRPage title={`${employee.first_name} ${employee.last_name}`} subtitle={`Employee Code: ${employee.employee_code}`}>
      <div className="mb-4">
        <button onClick={() => navigate("/zoiko-hr/employee-management/employees")} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mx-auto">
              {getInitials(employee.first_name, employee.last_name)}
            </div>
            <h2 className="text-lg font-bold text-gray-900 mt-3">{employee.first_name} {employee.last_name}</h2>
            <p className="text-sm text-gray-500">{employee.job_title}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[employee.status] || "bg-gray-100 text-gray-800"}`}>
                {(employee.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {EMPLOYMENT_TYPE_LABELS[employee.employment_type] || employee.employment_type}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Info</h3>
            <div className="flex items-start gap-3 text-sm">
              <Building className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900 font-medium">{deptName || "\u2014"}</p>
                <p className="text-gray-500 text-xs">Department</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Award className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900 font-medium">{getDesignationName(employee.designation_id) || "\u2014"}</p>
                <p className="text-gray-500 text-xs">Designation</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900 font-medium">{managerName || employee.reporting_manager_id || "\u2014"}</p>
                <p className="text-gray-500 text-xs">Reporting Manager</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900 font-medium">{employee.date_of_joining || "\u2014"}</p>
                <p className="text-gray-500 text-xs">Joined</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900 font-medium break-all">{employee.email}</p>
                <p className="text-gray-500 text-xs">Email</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900 font-medium">{employee.phone || "\u2014"}</p>
                <p className="text-gray-500 text-xs">Phone</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatBadge label="Salary" value={employee.basic_salary ? `$${Number(employee.basic_salary).toLocaleString()}` : "\u2014"} />
            <StatBadge label="CTC" value={employee.ctc ? `$${Number(employee.ctc).toLocaleString()}` : "\u2014"} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === tab.id
                        ? "text-blue-600 border-blue-600 bg-blue-50/50"
                        : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-4 space-y-4">
              {activeTab === "overview" && (
                <>
                  <SectionCard title="Personal Information" icon={User}>
                    <InfoRow label="First Name" value={employee.first_name} />
                    <InfoRow label="Last Name" value={employee.last_name} />
                    <InfoRow label="Email" value={employee.email} />
                    <InfoRow label="Phone" value={employee.phone} />
                    <InfoRow label="Work Email" value={employee.work_email} />
                    <InfoRow label="Personal Email" value={employee.personal_email} />
                    <InfoRow label="Date of Birth" value={employee.date_of_birth} />
                    <InfoRow label="Gender" value={employee.gender} />
                  </SectionCard>

                  <SectionCard title="Address" icon={MapPin}>
                    <InfoRow label="Current Address" value={employee.current_address} />
                    <InfoRow label="Permanent Address" value={employee.permanent_address} />
                    <InfoRow label="City" value={employee.city} />
                    <InfoRow label="State" value={employee.state} />
                    <InfoRow label="Country" value={employee.country} />
                    <InfoRow label="Pincode" value={employee.pincode} />
                  </SectionCard>

                  <SectionCard title="Organization" icon={Building}>
                    <InfoRow label="Company" value={employee.company} />
                    <InfoRow label="Business Unit" value={employee.business_unit} />
                    <InfoRow label="Division" value={employee.division} />
                    <InfoRow label="Team" value={employee.team} />
                  </SectionCard>
                </>
              )}

              {activeTab === "employment" && (
                <>
                  <SectionCard title="Job Details" icon={Briefcase}>
                    <InfoRow label="Job Title" value={employee.job_title} />
                    <InfoRow label="Department" value={deptName} />
                    <InfoRow label="Designation" value={getDesignationName(employee.designation_id)} />
                    <InfoRow label="Employment Type" value={EMPLOYMENT_TYPE_LABELS[employee.employment_type] || employee.employment_type} />
                    <InfoRow label="Status" value={(employee.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />
                  </SectionCard>

                  <SectionCard title="Dates" icon={Calendar}>
                    <InfoRow label="Date of Joining" value={employee.date_of_joining} />
                    <InfoRow label="Confirmation Date" value={employee.confirmation_date} />
                    <InfoRow label="Created At" value={employee.created_at} />
                  </SectionCard>

                  <SectionCard title="Reporting" icon={User}>
                    <InfoRow label="Reporting Manager" value={managerName || employee.reporting_manager_id ? `ID: ${employee.reporting_manager_id}` : null} />
                    <InfoRow label="Manager Email" value={manager?.email} />
                    <InfoRow label="Manager Phone" value={manager?.phone} />
                  </SectionCard>

                  <SectionCard title="Compensation" icon={DollarSign}>
                    <InfoRow label="Basic Salary" value={employee.basic_salary ? `$${Number(employee.basic_salary).toLocaleString()}` : null} />
                    <InfoRow label="CTC" value={employee.ctc ? `$${Number(employee.ctc).toLocaleString()}` : null} />
                  </SectionCard>
                </>
              )}

              {activeTab === "profile" && (
                <>
                  {profile ? (
                    <>
                      <SectionCard title="Emergency Contact" icon={Phone}>
                        <InfoRow label="Contact Name" value={profile.emergency_contact_name} />
                        <InfoRow label="Contact Phone" value={profile.emergency_contact_phone} />
                        <InfoRow label="Relation" value={profile.emergency_contact_relation} />
                      </SectionCard>

                      <SectionCard title="Personal Details" icon={User}>
                        <InfoRow label="Blood Group" value={profile.blood_group} />
                        <InfoRow label="Marital Status" value={profile.marital_status} />
                        <InfoRow label="Nationality" value={profile.nationality} />
                        <InfoRow label="Religion" value={profile.religion} />
                      </SectionCard>

                      <SectionCard title="Identity Documents" icon={Shield}>
                        <InfoRow label="PAN Number" value={profile.pan_number} />
                        <InfoRow label="Aadhar Number" value={profile.aadhar_number} />
                        <InfoRow label="UAN Number" value={profile.uan_number} />
                        <InfoRow label="PF Number" value={profile.pf_number} />
                        <InfoRow label="ESIC Number" value={profile.esic_number} />
                      </SectionCard>

                      <SectionCard title="Bank Details" icon={DollarSign}>
                        <InfoRow label="Bank Name" value={profile.bank_name} />
                        <InfoRow label="Account Number" value={profile.bank_account} />
                        <InfoRow label="IFSC Code" value={profile.bank_ifsc} />
                      </SectionCard>

                      <SectionCard title="Passport & Visa" icon={BookOpen}>
                        <InfoRow label="Passport Number" value={profile.passport_number} />
                        <InfoRow label="Passport Expiry" value={profile.passport_expiry} />
                        <InfoRow label="Visa Number" value={profile.visa_number} />
                        <InfoRow label="Visa Expiry" value={profile.visa_expiry} />
                        <InfoRow label="Work Permit Expiry" value={profile.work_permit_expiry} />
                      </SectionCard>

                      {profile.skills && <SectionCard title="Skills" icon={Award}><p className="text-sm text-gray-900 whitespace-pre-wrap">{profile.skills}</p></SectionCard>}
                      {profile.certifications && <SectionCard title="Certifications" icon={Award}><p className="text-sm text-gray-900 whitespace-pre-wrap">{profile.certifications}</p></SectionCard>}
                      {profile.projects && <SectionCard title="Projects" icon={Briefcase}><p className="text-sm text-gray-900 whitespace-pre-wrap">{profile.projects}</p></SectionCard>}
                      {profile.achievements && <SectionCard title="Achievements" icon={Award}><p className="text-sm text-gray-900 whitespace-pre-wrap">{profile.achievements}</p></SectionCard>}
                      {profile.notes && <SectionCard title="Notes" icon={BookOpen}><p className="text-sm text-gray-900 whitespace-pre-wrap">{profile.notes}</p></SectionCard>}
                    </>
                  ) : (
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
                      <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 font-medium">No extended profile data available</p>
                      <p className="text-xs text-gray-400 mt-1">Extended profile information has not been added for this employee.</p>
                    </div>
                  )}
                </>
              )}

              {activeTab === "lifecycle" && (
                <>
                  {lifecycle.length > 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {lifecycle.map((event, idx) => (
                              <tr key={event.id || idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {(event.event_type || event.type || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{event.event_date || event.date || event.created_at || "\u2014"}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{event.description || event.details || event.notes || "\u2014"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
                      <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 font-medium">No lifecycle events</p>
                      <p className="text-xs text-gray-400 mt-1">Lifecycle events will appear here when the employee is promoted, transferred, or exits.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </HRPage>
  );
}
