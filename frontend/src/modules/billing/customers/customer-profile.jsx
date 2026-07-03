import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HRPage from '../../../components/HRPage';
import { customerApi, invoiceApi, paymentApi, contractApi, subscriptionApi, creditNoteApi } from '../../../service/billingService';
import {
  ArrowLeft, Mail, Phone, Building2, User, MapPin, CreditCard,
  FileText, RefreshCw, Plus, Pencil, Trash2, CheckCircle, XCircle,
  AlertCircle, Loader2, Star, Ban, Play, Activity, Files, StickyNote,
  Download, Upload, Pin, Archive, Clock, Search,
} from 'lucide-react';



const TABS = [
  { key: 'details', label: 'Details', icon: User },
  { key: 'contacts', label: 'Contacts', icon: Mail },
  { key: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
  { key: 'billing-history', label: 'Billing History', icon: FileText },
  { key: 'contracts', label: 'Contracts', icon: FileText },
  { key: 'subscriptions', label: 'Subscriptions', icon: FileText },
  { key: 'credit-notes', label: 'Credit Notes', icon: FileText },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'documents', label: 'Documents', icon: Files },
  { key: 'notes', label: 'Notes', icon: StickyNote },
];



function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    suspended: 'bg-amber-100 text-amber-700',
    pending: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'active' ? 'bg-emerald-500' :
        status === 'suspended' ? 'bg-amber-500' :
        status === 'inactive' ? 'bg-gray-400' : 'bg-blue-500'
      }`} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  );
}

function InvoiceStatusBadge({ status }) {
  const styles = {
    paid: 'bg-emerald-100 text-emerald-700',
    unpaid: 'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-slate-100 text-slate-500',
    void: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
      <p className="text-sm text-red-600 mb-3">{message || 'Failed to load data'}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-10 w-10 text-gray-300 mb-3" />
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      {message && <p className="text-xs text-gray-400">{message}</p>}
    </div>
  );
}

function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function InlineEditField({ label, value, editing, onChange, type = 'text', required }) {
  if (!editing) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-900 mt-0.5">{value || '—'}</p>
      </div>
    );
  }
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      />
    </div>
  );
}

export default function CustomerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('details');

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState(null);

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [paymentMethodsError, setPaymentMethodsError] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState(null);

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);

  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState(null);

  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState(null);

  const [creditNotes, setCreditNotes] = useState([]);
  const [creditNotesLoading, setCreditNotesLoading] = useState(false);
  const [creditNotesError, setCreditNotesError] = useState(null);

  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState(null);

  const [docForm, setDocForm] = useState({ file_name: '', file_path: '', file_size: null, mime_type: '', document_type: '', notes: '' });
  const [showDocForm, setShowDocForm] = useState(false);
  const [docSaving, setDocSaving] = useState(false);

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);

  const [noteForm, setNoteForm] = useState({ content: '', is_pinned: false, is_internal: false });
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteFormError, setNoteFormError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', company: '', address: '', tax_id: '' });

  const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', email: '', phone: '', job_title: '', is_primary: false });
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactFormError, setContactFormError] = useState(null);

  const [pmForm, setPmForm] = useState({ type: 'card', last_four: '', expiry_date: '', cardholder_name: '', is_default: false });
  const [showPmForm, setShowPmForm] = useState(false);
  const [editingPmId, setEditingPmId] = useState(null);
  const [pmSaving, setPmSaving] = useState(false);
  const [pmFormError, setPmFormError] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchCustomer = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerApi.get(id);
      setCustomer(data);
      setEditForm({
        display_name: data.display_name || data.company_name || '',
        company_name: data.company_name || '',
        email: data.email || '',
        phone: data.phone || '',
        billing_address: data.billing_address || '',
        shipping_address: data.shipping_address || '',
        tax_id: data.tax_id || '',
      });
    } catch (err) {
      setError(err?.detail || err?.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchContacts = useCallback(async () => {
    if (!id) return;
    try {
      setContactsLoading(true);
      setContactsError(null);
      const data = await customerApi.listContacts(id);
      setContacts(Array.isArray(data) ? data : data?.items || data?.contacts || []);
    } catch (err) {
      setContactsError(err?.detail || err?.message || 'Failed to load contacts');
    } finally {
      setContactsLoading(false);
    }
  }, [id]);

  const fetchPaymentMethods = useCallback(async () => {
    if (!id) return;
    try {
      setPaymentMethodsLoading(true);
      setPaymentMethodsError(null);
      const data = await paymentApi.listMethods(id);
      setPaymentMethods(Array.isArray(data) ? data : data?.items || data?.payment_methods || []);
    } catch (err) {
      setPaymentMethodsError(err?.detail || err?.message || 'Failed to load payment methods');
    } finally {
      setPaymentMethodsLoading(false);
    }
  }, [id]);

  const fetchInvoices = useCallback(async () => {
    if (!id) return;
    try {
      setInvoicesLoading(true);
      setInvoicesError(null);
      const data = await invoiceApi.list({ customer_id: id, per_page: 20 });
      const items = Array.isArray(data) ? data : data?.items || data?.invoices || data?.data || [];
      setInvoices(items);
    } catch (err) {
      setInvoicesError(err?.detail || err?.message || 'Failed to load invoices');
    } finally {
      setInvoicesLoading(false);
    }
  }, [id]);

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    try {
      setPaymentsLoading(true);
      setPaymentsError(null);
      const data = await paymentApi.list({ customer_id: id, per_page: 20 });
      const items = Array.isArray(data) ? data : data?.items || data?.payments || data?.data || [];
      setPayments(items);
    } catch (err) {
      setPaymentsError(err?.detail || err?.message || 'Failed to load payments');
    } finally {
      setPaymentsLoading(false);
    }
  }, [id]);

  const fetchContracts = useCallback(async () => {
    if (!id) return;
    try {
      setContractsLoading(true);
      setContractsError(null);
      const data = await contractApi.list({ customer_id: id, per_page: 50 });
      const items = Array.isArray(data) ? data : data?.items || data?.contracts || data?.data || [];
      setContracts(items);
    } catch (err) {
      setContractsError(err?.detail || err?.message || 'Failed to load contracts');
    } finally {
      setContractsLoading(false);
    }
  }, [id]);

  const fetchSubscriptions = useCallback(async () => {
    if (!id) return;
    try {
      setSubscriptionsLoading(true);
      setSubscriptionsError(null);
      const data = await subscriptionApi.list({ customer_id: id, per_page: 50 });
      const items = Array.isArray(data) ? data : data?.items || data?.subscriptions || data?.data || [];
      setSubscriptions(items);
    } catch (err) {
      setSubscriptionsError(err?.detail || err?.message || 'Failed to load subscriptions');
    } finally {
      setSubscriptionsLoading(false);
    }
  }, [id]);

  const fetchCreditNotes = useCallback(async () => {
    if (!id) return;
    try {
      setCreditNotesLoading(true);
      setCreditNotesError(null);
      const data = await creditNoteApi.list({ customer_id: id, per_page: 50 });
      const items = Array.isArray(data) ? data : data?.items || data?.credit_notes || data?.data || [];
      setCreditNotes(items);
    } catch (err) {
      setCreditNotesError(err?.detail || err?.message || 'Failed to load credit notes');
    } finally {
      setCreditNotesLoading(false);
    }
  }, [id]);

  const fetchActivity = useCallback(async () => {
    if (!id) return;
    try {
      setActivityLoading(true);
      setActivityError(null);
      const data = await customerApi.getActivity(id);
      setActivity(Array.isArray(data) ? data : []);
    } catch (err) {
      setActivityError(err?.detail || err?.message || 'Failed to load activity');
    } finally {
      setActivityLoading(false);
    }
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    if (!id) return;
    try {
      setDocumentsLoading(true);
      setDocumentsError(null);
      const data = await customerApi.listDocuments(id);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setDocumentsError(err?.detail || err?.message || 'Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  }, [id]);

  const fetchNotes = useCallback(async () => {
    if (!id) return;
    try {
      setNotesLoading(true);
      setNotesError(null);
      const data = await customerApi.listNotes(id);
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotesError(err?.detail || err?.message || 'Failed to load notes');
    } finally {
      setNotesLoading(false);
    }
  }, [id]);

  const refreshAll = useCallback(() => {
    fetchCustomer();
    fetchContacts();
    fetchPaymentMethods();
    fetchInvoices();
    fetchPayments();
    fetchContracts();
    fetchSubscriptions();
    fetchCreditNotes();
    fetchActivity();
    fetchDocuments();
    fetchNotes();
  }, [fetchCustomer, fetchContacts, fetchPaymentMethods, fetchInvoices, fetchPayments, fetchContracts, fetchSubscriptions, fetchCreditNotes, fetchActivity, fetchDocuments, fetchNotes]);

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id, fetchCustomer]);

  useEffect(() => {
    if (id && activeTab === 'contacts') fetchContacts();
  }, [id, activeTab, fetchContacts]);

  useEffect(() => {
    if (id && activeTab === 'payment-methods') fetchPaymentMethods();
  }, [id, activeTab, fetchPaymentMethods]);

  useEffect(() => {
    if (id && activeTab === 'billing-history') { fetchInvoices(); fetchPayments(); }
  }, [id, activeTab, fetchInvoices, fetchPayments]);

  useEffect(() => {
    if (id && activeTab === 'contracts') fetchContracts();
  }, [id, activeTab, fetchContracts]);

  useEffect(() => {
    if (id && activeTab === 'subscriptions') fetchSubscriptions();
  }, [id, activeTab, fetchSubscriptions]);

  useEffect(() => {
    if (id && activeTab === 'credit-notes') fetchCreditNotes();
  }, [id, activeTab, fetchCreditNotes]);

  useEffect(() => {
    if (id && activeTab === 'activity') fetchActivity();
  }, [id, activeTab, fetchActivity]);

  useEffect(() => {
    if (id && activeTab === 'documents') fetchDocuments();
  }, [id, activeTab, fetchDocuments]);

  useEffect(() => {
    if (id && activeTab === 'notes') fetchNotes();
  }, [id, activeTab, fetchNotes]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await customerApi.update(id, editForm);
      setEditing(false);
      await fetchCustomer();
    } catch (err) {
      setError(err?.detail || err?.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action) => {
    try {
      setActionLoading(true);
      setActionError(null);
      const actions = { activate: customerApi.activate, deactivate: customerApi.deactivate, suspend: customerApi.suspend };
      await actions[action](id);
      await fetchCustomer();
    } catch (err) {
      setActionError(err?.detail || err?.message || `Failed to ${action} customer`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    try {
      setContactSaving(true);
      setContactFormError(null);
      if (editingContactId) {
        await customerApi.updateContact(id, editingContactId, contactForm);
      } else {
        await customerApi.addContact(id, contactForm);
      }
      setShowContactForm(false);
      setEditingContactId(null);
      setContactForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '', is_primary: false });
      await fetchContacts();
    } catch (err) {
      setContactFormError(err?.detail || err?.message || 'Failed to save contact');
    } finally {
      setContactSaving(false);
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      setContactSaving(true);
      await customerApi.removeContact(id, contactId);
      await fetchContacts();
    } catch (err) {
      setContactsError(err?.detail || err?.message || 'Failed to remove contact');
    } finally {
      setContactSaving(false);
    }
  };

  const handleSetPrimaryContact = async (contactId) => {
    try {
      setContactSaving(true);
      await customerApi.setPrimaryContact(id, contactId);
      await fetchContacts();
    } catch (err) {
      setContactsError(err?.detail || err?.message || 'Failed to set primary contact');
    } finally {
      setContactSaving(false);
    }
  };

  const handleSavePm = async (e) => {
    e.preventDefault();
    try {
      setPmSaving(true);
      setPmFormError(null);
      if (editingPmId) {
        await paymentApi.updateMethod(editingPmId, pmForm);
      } else {
        await paymentApi.addMethod({ ...pmForm, customer_id: id });
      }
      setShowPmForm(false);
      setEditingPmId(null);
      setPmForm({ type: 'card', last_four: '', expiry_date: '', cardholder_name: '', is_default: false });
      await fetchPaymentMethods();
    } catch (err) {
      setPmFormError(err?.detail || err?.message || 'Failed to save payment method');
    } finally {
      setPmSaving(false);
    }
  };

  const handleRemovePm = async (pmId) => {
    try {
      setPmSaving(true);
      await paymentApi.removeMethod(pmId);
      await fetchPaymentMethods();
    } catch (err) {
      setPaymentMethodsError(err?.detail || err?.message || 'Failed to remove payment method');
    } finally {
      setPmSaving(false);
    }
  };

  const handleSetDefaultPm = async (pmId) => {
    try {
      setPmSaving(true);
      await paymentApi.setDefaultMethod(pmId);
      await fetchPaymentMethods();
    } catch (err) {
      setPaymentMethodsError(err?.detail || err?.message || 'Failed to set default payment method');
    } finally {
      setPmSaving(false);
    }
  };

  const handleSaveDoc = async (e) => {
    e.preventDefault();
    try {
      setDocSaving(true);
      await customerApi.addDocument(id, docForm);
      setShowDocForm(false);
      setDocForm({ file_name: '', file_path: '', file_size: null, mime_type: '', document_type: '', notes: '' });
      await fetchDocuments();
    } catch (err) {
      setDocumentsError(err?.detail || err?.message || 'Failed to save document');
    } finally {
      setDocSaving(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await customerApi.deleteDocument(id, docId);
      await fetchDocuments();
    } catch (err) {
      setDocumentsError(err?.detail || err?.message || 'Failed to delete document');
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    try {
      setNoteSaving(true);
      setNoteFormError(null);
      if (editingNoteId) {
        await customerApi.updateNote(id, editingNoteId, noteForm);
      } else {
        await customerApi.addNote(id, noteForm);
      }
      setShowNoteForm(false);
      setEditingNoteId(null);
      setNoteForm({ content: '', is_pinned: false, is_internal: false });
      await fetchNotes();
    } catch (err) {
      setNoteFormError(err?.detail || err?.message || 'Failed to save note');
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await customerApi.deleteNote(id, noteId);
      await fetchNotes();
    } catch (err) {
      setNotesError(err?.detail || err?.message || 'Failed to delete note');
    }
  };

  if (loading) {
    return (
      <HRPage title="Customer Profile" subtitle="Loading customer details...">
        <Spinner />
      </HRPage>
    );
  }

  if (error && !customer) {
    return (
      <HRPage title="Customer Profile" subtitle="Error loading customer">
        <ErrorState message={error} onRetry={fetchCustomer} />
      </HRPage>
    );
  }

  return (
    <HRPage title={customer?.display_name || customer?.company_name || 'Customer Profile'} subtitle={`Customer #${id}`}>

      <div className="mb-4">
        <button onClick={() => navigate('/billing/customers')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </button>
      </div>

      {actionError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {actionError}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-violet-100 flex items-center justify-center">
              <User className="h-7 w-7 text-violet-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{customer?.display_name || customer?.company_name}</h2>
                <StatusBadge status={customer?.status} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                {customer?.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {customer.email}</span>}
                {customer?.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {customer.phone}</span>}
                {customer?.company_name && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {customer.company_name}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {customer?.status === 'active' && (
              <button onClick={() => handleAction('deactivate')} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Deactivate
              </button>
            )}
            {customer?.status === 'inactive' && (
              <button onClick={() => handleAction('activate')} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Activate
              </button>
            )}
            {customer?.status === 'active' && (
              <button onClick={() => handleAction('suspend')} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />} Suspend
              </button>
            )}
            <button onClick={refreshAll} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'details' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button onClick={() => { setEditing(false); setEditForm({ display_name: customer?.display_name || customer?.company_name || '', company_name: customer?.company_name || '', email: customer?.email || '', phone: customer?.phone || '', billing_address: customer?.billing_address || '', shipping_address: customer?.shipping_address || '', tax_id: customer?.tax_id || '' }); }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Save Changes
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InlineEditField label="Display Name" value={editForm.display_name} editing={editing} onChange={(v) => setEditForm({ ...editForm, display_name: v })} required />
            <InlineEditField label="Company Name" value={editForm.company_name} editing={editing} onChange={(v) => setEditForm({ ...editForm, company_name: v })} />
            <InlineEditField label="Email" value={editForm.email} editing={editing} onChange={(v) => setEditForm({ ...editForm, email: v })} type="email" />
            <InlineEditField label="Phone" value={editForm.phone} editing={editing} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
            <InlineEditField label="Billing Address" value={editForm.billing_address} editing={editing} onChange={(v) => setEditForm({ ...editForm, billing_address: v })} />
            <InlineEditField label="Shipping Address" value={editForm.shipping_address} editing={editing} onChange={(v) => setEditForm({ ...editForm, shipping_address: v })} />
            <InlineEditField label="Tax ID" value={editForm.tax_id} editing={editing} onChange={(v) => setEditForm({ ...editForm, tax_id: v })} />
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Account Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatDate(customer?.created_at || customer?.createdAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatDate(customer?.updated_at || customer?.updatedAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Invoices</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{invoices.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  <StatusBadge status={customer?.status} />
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
            <button onClick={() => { setShowContactForm(true); setEditingContactId(null); setContactForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '', is_primary: false }); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
              <Plus className="h-4 w-4" /> Add Contact
            </button>
          </div>

          {contactsError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {contactsError}
            </div>
          )}

          {showContactForm && (
            <form onSubmit={handleSaveContact} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">{editingContactId ? 'Edit Contact' : 'Add Contact'}</h4>
              {contactFormError && (
                <p className="mb-3 text-xs text-red-600">{contactFormError}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                  <input required value={contactForm.first_name} onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                  <input required value={contactForm.last_name} onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" required value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Job Title</label>
                  <input value={contactForm.job_title} onChange={(e) => setContactForm({ ...contactForm, job_title: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input type="checkbox" id="is_primary" checked={contactForm.is_primary}
                  onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                <label htmlFor="is_primary" className="text-sm text-gray-700">Set as primary contact</label>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" disabled={contactSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {contactSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} {editingContactId ? 'Update' : 'Add'} Contact
                </button>
                <button type="button" onClick={() => { setShowContactForm(false); setEditingContactId(null); setContactFormError(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {contactsLoading ? (
            <Spinner />
          ) : contacts.length === 0 ? (
            <EmptyState icon={Mail} title="No contacts" message="Add a contact to get started." />
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id || contact._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                        {contact.is_primary && <Star className="h-3.5 w-3.5 text-amber-400" />}
                      </div>
                      <p className="text-xs text-gray-500">{contact.email}{contact.phone ? ` · ${contact.phone}` : ''}{contact.job_title ? ` · ${contact.job_title}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!contact.is_primary && (
                      <button onClick={() => handleSetPrimaryContact(contact.id)} title="Set primary"
                        className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition-colors">
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => { setEditingContactId(contact.id); setContactForm({ first_name: contact.first_name || '', last_name: contact.last_name || '', email: contact.email, phone: contact.phone || '', job_title: contact.job_title || '', is_primary: contact.is_primary || false }); setShowContactForm(true); }}
                      className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemoveContact(contact.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payment-methods' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
            <button onClick={() => { setShowPmForm(true); setEditingPmId(null); setPmForm({ type: 'card', last_four: '', expiry_date: '', cardholder_name: '', is_default: false }); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
              <Plus className="h-4 w-4" /> Add Method
            </button>
          </div>

          {paymentMethodsError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {paymentMethodsError}
            </div>
          )}

          {showPmForm && (
            <form onSubmit={handleSavePm} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">{editingPmId ? 'Edit Payment Method' : 'Add Payment Method'}</h4>
              {pmFormError && (
                <p className="mb-3 text-xs text-red-600">{pmFormError}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                  <select required value={pmForm.type} onChange={(e) => setPmForm({ ...pmForm, type: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                    <option value="card">Card</option>
                    <option value="bank_account">Bank Account</option>
                    <option value="paypal">PayPal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cardholder Name</label>
                  <input value={pmForm.cardholder_name} onChange={(e) => setPmForm({ ...pmForm, cardholder_name: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Four *</label>
                  <input required maxLength={4} value={pmForm.last_four} onChange={(e) => setPmForm({ ...pmForm, last_four: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input placeholder="MM/YY" value={pmForm.expiry_date} onChange={(e) => setPmForm({ ...pmForm, expiry_date: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input type="checkbox" id="pm_default" checked={pmForm.is_default}
                  onChange={(e) => setPmForm({ ...pmForm, is_default: e.target.checked })}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                <label htmlFor="pm_default" className="text-sm text-gray-700">Set as default method</label>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" disabled={pmSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {pmSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} {editingPmId ? 'Update' : 'Add'} Method
                </button>
                <button type="button" onClick={() => { setShowPmForm(false); setEditingPmId(null); setPmFormError(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {paymentMethodsLoading ? (
            <Spinner />
          ) : paymentMethods.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payment methods" message="Add a payment method to get started." />
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <div key={pm.id || pm._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900">
                          {pm.type === 'card' ? '•••• ' : ''}{pm.last_four || pm.lastFour || pm.last_four_digits}
                        </p>
                        {pm.is_default && <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Default</span>}
                      </div>
                      <p className="text-xs text-gray-500">{pm.cardholder_name}{pm.expiry_date ? ` · Exp: ${pm.expiry_date}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!pm.is_default && (
                      <button onClick={() => handleSetDefaultPm(pm.id)} title="Set default"
                        className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition-colors">
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => { setEditingPmId(pm.id); setPmForm({ type: pm.type, last_four: pm.last_four || pm.lastFour || '', expiry_date: pm.expiry_date || '', cardholder_name: pm.cardholder_name || '', is_default: pm.is_default }); setShowPmForm(true); }}
                      className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemovePm(pm.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'billing-history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoices</h3>
            {invoicesLoading ? (
              <Spinner />
            ) : invoicesError ? (
              <ErrorState message={invoicesError} onRetry={fetchInvoices} />
            ) : invoices.length === 0 ? (
              <EmptyState icon={FileText} title="No invoices" message="This customer has no invoices yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Invoice</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                      <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 10).map((inv) => (
                      <tr key={inv.id || inv._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-900">{inv.invoice_number || inv.number || inv.id}</td>
                        <td className="py-3 px-3 text-gray-500">{formatDate(inv.issue_date || inv.date || inv.created_at)}</td>
                        <td className="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(inv.total || inv.amount || inv.total_amount)}</td>
                        <td className="py-3 px-3 text-center"><InvoiceStatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payments</h3>
            {paymentsLoading ? (
              <Spinner />
            ) : paymentsError ? (
              <ErrorState message={paymentsError} onRetry={fetchPayments} />
            ) : payments.length === 0 ? (
              <EmptyState icon={FileText} title="No payments" message="This customer has no payments yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Payment</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Method</th>
                      <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 10).map((p) => (
                      <tr key={p.id || p._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-900">{p.payment_number || p.transaction_id || p.id}</td>
                        <td className="py-3 px-3 text-gray-500">{formatDate(p.payment_date || p.date || p.created_at)}</td>
                        <td className="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(p.amount || p.total_amount)}</td>
                        <td className="py-3 px-3 text-gray-500">{p.payment_method || p.method || p.type || '—'}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            p.status === 'completed' || p.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            p.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contracts</h3>
          {contractsLoading ? (
            <Spinner />
          ) : contractsError ? (
            <ErrorState message={contractsError} onRetry={fetchContracts} />
          ) : contracts.length === 0 ? (
            <EmptyState icon={FileText} title="No contracts" message="This customer has no contracts." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Contract</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Start Date</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">End Date</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Value</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id || c._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">{c.contract_number || c.name || c.id}</td>
                      <td className="py-3 px-3 text-gray-500">{formatDate(c.start_date || c.startDate)}</td>
                      <td className="py-3 px-3 text-gray-500">{formatDate(c.end_date || c.endDate)}</td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(c.value || c.total_value || c.contract_value)}</td>
                      <td className="py-3 px-3 text-center"><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscriptions</h3>
          {subscriptionsLoading ? (
            <Spinner />
          ) : subscriptionsError ? (
            <ErrorState message={subscriptionsError} onRetry={fetchSubscriptions} />
          ) : subscriptions.length === 0 ? (
            <EmptyState icon={FileText} title="No subscriptions" message="This customer has no subscriptions." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Subscription</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Plan</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Start</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Next Billing</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id || sub._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">{sub.subscription_number || sub.name || sub.id}</td>
                      <td className="py-3 px-3 text-gray-500">{sub.plan_name || sub.plan?.name || '—'}</td>
                      <td className="py-3 px-3 text-gray-500">{formatDate(sub.start_date || sub.startDate)}</td>
                      <td className="py-3 px-3 text-gray-500">{formatDate(sub.next_billing_date || sub.nextBillingDate)}</td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(sub.amount || sub.price || sub.recurring_amount)}</td>
                      <td className="py-3 px-3 text-center"><StatusBadge status={sub.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'credit-notes' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Notes</h3>
          {creditNotesLoading ? (
            <Spinner />
          ) : creditNotesError ? (
            <ErrorState message={creditNotesError} onRetry={fetchCreditNotes} />
          ) : creditNotes.length === 0 ? (
            <EmptyState icon={FileText} title="No credit notes" message="This customer has no credit notes." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Credit Note</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Reason</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {creditNotes.map((cn) => (
                    <tr key={cn.id || cn._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">{cn.credit_note_number || cn.number || cn.id}</td>
                      <td className="py-3 px-3 text-gray-500">{formatDate(cn.issue_date || cn.date || cn.created_at)}</td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(cn.total || cn.amount || cn.total_amount)}</td>
                      <td className="py-3 px-3 text-gray-500">{cn.reason || cn.description || '—'}</td>
                      <td className="py-3 px-3 text-center"><InvoiceStatusBadge status={cn.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
          </div>
          {activityLoading ? (
            <Spinner />
          ) : activityError ? (
            <ErrorState message={activityError} onRetry={fetchActivity} />
          ) : activity.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" message="Customer activity will appear here." />
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {activity.map((item, idx) => (
                  <li key={item.id || idx}>
                    <div className="relative pb-8">
                      {idx < activity.length - 1 && <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />}
                      <div className="relative flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center ring-8 ring-white flex-shrink-0">
                          <Clock className="h-4 w-4 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{item.action ? item.action.charAt(0).toUpperCase() + item.action.slice(1) : 'Action'}</p>
                            <span className="text-xs text-gray-500">{item.timestamp ? formatDate(item.timestamp) : ''}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.actor_id ? `By user #${item.actor_id}` : 'System'}
                            {item.entity_type ? ` · ${item.entity_type}` : ''}
                          </p>
                          {item.new_values && (
                            <p className="text-xs text-gray-400 mt-1 font-mono truncate">{JSON.stringify(item.new_values).slice(0, 100)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
            <button onClick={() => { setShowDocForm(true); setDocForm({ file_name: '', file_path: '', file_size: null, mime_type: '', document_type: '', notes: '' }); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
              <Upload className="h-4 w-4" /> Add Document
            </button>
          </div>

          {documentsError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {documentsError}
            </div>
          )}

          {showDocForm && (
            <form onSubmit={handleSaveDoc} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Add Document</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">File Name *</label>
                  <input required value={docForm.file_name} onChange={(e) => setDocForm({ ...docForm, file_name: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">File Path</label>
                  <input value={docForm.file_path} onChange={(e) => setDocForm({ ...docForm, file_path: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Document Type</label>
                  <input value={docForm.document_type} onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">MIME Type</label>
                  <input value={docForm.mime_type} onChange={(e) => setDocForm({ ...docForm, mime_type: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={docForm.notes} onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })} rows={2}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" disabled={docSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {docSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Add Document
                </button>
                <button type="button" onClick={() => setShowDocForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {documentsLoading ? (
            <Spinner />
          ) : documents.length === 0 ? (
            <EmptyState icon={Files} title="No documents" message="Upload a document to get started." />
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id || doc._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                      <p className="text-xs text-gray-500">{doc.document_type ? `${doc.document_type}` : ''}{doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(1)} KB` : ''}{doc.mime_type ? ` · ${doc.mime_type}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {doc.file_path && (
                      <a href={doc.file_path} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors">
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    <button onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
            <button onClick={() => { setShowNoteForm(true); setEditingNoteId(null); setNoteForm({ content: '', is_pinned: false, is_internal: false }); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
              <Plus className="h-4 w-4" /> Add Note
            </button>
          </div>

          {notesError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {notesError}
            </div>
          )}

          {showNoteForm && (
            <form onSubmit={handleSaveNote} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">{editingNoteId ? 'Edit Note' : 'Add Note'}</h4>
              {noteFormError && (
                <p className="mb-3 text-xs text-red-600">{noteFormError}</p>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Content *</label>
                <textarea required rows={3} value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
              <div className="flex items-center gap-4 mt-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={noteForm.is_pinned} onChange={(e) => setNoteForm({ ...noteForm, is_pinned: e.target.checked })}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                  <span className="text-sm text-gray-700"><Pin className="h-3.5 w-3.5 inline mr-1" />Pinned</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={noteForm.is_internal} onChange={(e) => setNoteForm({ ...noteForm, is_internal: e.target.checked })}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                  <span className="text-sm text-gray-700">Internal note</span>
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" disabled={noteSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {noteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} {editingNoteId ? 'Update' : 'Add'} Note
                </button>
                <button type="button" onClick={() => { setShowNoteForm(false); setEditingNoteId(null); setNoteFormError(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {notesLoading ? (
            <Spinner />
          ) : notes.length === 0 ? (
            <EmptyState icon={StickyNote} title="No notes" message="Add a note to get started." />
          ) : (
            <div className="space-y-3">
              {notes.filter(n => n.is_pinned).concat(notes.filter(n => !n.is_pinned)).map((note) => (
                <div key={note.id || note._id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {note.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-400" />}
                        {note.is_internal && <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Internal</span>}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {note.created_at ? formatDate(note.created_at) : ''}
                        {note.created_by ? ` · by #${note.created_by}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { setEditingNoteId(note.id); setNoteForm({ content: note.content, is_pinned: note.is_pinned || false, is_internal: note.is_internal || false }); setShowNoteForm(true); }}
                        className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </HRPage>
  );
}
