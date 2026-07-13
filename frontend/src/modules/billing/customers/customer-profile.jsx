import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HRPage from '../../../components/HRPage';
import { customerApi, invoiceApi, paymentApi, contractApi, subscriptionApi, creditNoteApi, settingsApi, quoteApi } from '../../../service/billingService';
import {
  ArrowLeft, Mail, Phone, Building2, User, CreditCard,
  FileText, RefreshCw, Plus, Pencil, Trash2, CheckCircle,
  AlertCircle, Loader2, Star, Ban, Play, Activity, Files, StickyNote,
  Download, Upload, Pin, Clock, MapPin, Globe, BarChart3,
} from 'lucide-react';
import { formatDisplayCurrency, formatDisplayDate } from '../../../utils/billing-helpers';
import { getCurrencySelectOptions } from '../../../utils/currency';
import { Spinner, ErrorState, EmptyState } from '../../../components/billing-shared';



const TABS = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'contacts', label: 'Contacts', icon: Mail },
  { key: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
  { key: 'billing-overview', label: 'Billing Overview', icon: FileText },
  { key: 'quotations', label: 'Quotations', icon: FileText },
  { key: 'contracts', label: 'Contracts', icon: FileText },
  { key: 'subscriptions', label: 'Subscriptions', icon: FileText },
  { key: 'credit-notes', label: 'Credit Notes', icon: FileText },
  { key: 'timeline', label: 'Timeline', icon: Clock },
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

  const [activeTab, setActiveTab] = useState('overview');

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

  const [quotations, setQuotations] = useState([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [quotationsError, setQuotationsError] = useState(null);

  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

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
  const [orgConfig, setOrgConfig] = useState(null);
  const [editForm, setEditForm] = useState({
    display_name: '', company_name: '', email: '', phone: '', website: '',
    billing_address: '', shipping_address: '', shipping_same_as_billing: false,
    gst_number: '', vat_number: '', pan: '', tin: '', tax_id: '',
    currency: '', payment_terms: 'net_30', credit_limit: '', credit_days: 30, price_list: '',
    notes: '',
  });

  const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', email: '', phone: '', job_title: '', department: '', is_primary: false });
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
        website: data.website || '',
        billing_address: data.billing_address || '',
        shipping_address: data.shipping_address || '',
        shipping_same_as_billing: false,
        gst_number: data.gst_number || '',
        vat_number: data.vat_number || '',
        pan: data.pan || '',
        tin: data.tin || '',
        tax_id: data.tax_id || '',
        currency: data.currency || '',
        payment_terms: data.payment_terms || 'net_30',
        credit_limit: data.credit_limit || '',
        credit_days: data.credit_days != null ? Number(data.credit_days) : 30,
        price_list: data.price_list || '',
        notes: data.notes || '',
      });
      settingsApi.getConfig().then(setOrgConfig).catch(() => {});
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

  const fetchQuotations = useCallback(async () => {
    if (!id) return;
    try {
      setQuotationsLoading(true);
      setQuotationsError(null);
      const data = await quoteApi.list({ customer_id: id, per_page: 50 });
      const items = Array.isArray(data) ? data : data?.items || data?.quotations || data?.data || [];
      setQuotations(items);
    } catch (err) {
      setQuotationsError(err?.detail || err?.message || 'Failed to load quotations');
    } finally {
      setQuotationsLoading(false);
    }
  }, [id]);

  const buildTimeline = useCallback(() => {
    const events = [];
    notes.forEach((n) => {
      if (n.created_at) events.push({ date: n.created_at, type: 'note', label: 'Note Added', description: n.content?.slice(0, 120), actor: n.created_by });
    });
    activity.forEach((a) => {
      if (a.timestamp) events.push({ date: a.timestamp, type: 'activity', label: a.action ? a.action.charAt(0).toUpperCase() + a.action.slice(1) : 'Action', description: a.entity_type || '', actor: a.actor_id });
    });
    invoices.forEach((inv) => {
      const d = inv.issue_date || inv.created_at;
      if (d) events.push({ date: d, type: 'invoice', label: `Invoice ${inv.invoice_number || ''}`, description: inv.status ? `Status: ${inv.status}` : '', amount: inv.total || inv.amount });
    });
    payments.forEach((p) => {
      const d = p.payment_date || p.created_at;
      if (d) events.push({ date: d, type: 'payment', label: `Payment ${p.payment_number || p.transaction_id || ''}`, description: p.payment_method || '', amount: p.amount });
    });
    quotations.forEach((q) => {
      const d = q.issue_date || q.created_at;
      if (d) events.push({ date: d, type: 'quotation', label: `Quotation ${q.quotation_number || ''}`, description: q.status ? `Status: ${q.status}` : '', amount: q.total || q.amount });
    });
    creditNotes.forEach((cn) => {
      const d = cn.issue_date || cn.created_at;
      if (d) events.push({ date: d, type: 'credit_note', label: `Credit Note ${cn.credit_note_number || ''}`, description: cn.reason || '', amount: cn.total || cn.amount });
    });
    if (customer?.created_at) events.push({ date: customer.created_at, type: 'customer', label: 'Customer Created', description: 'Customer account created' });
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    setTimeline(events);
    setTimelineLoading(false);
  }, [notes, activity, invoices, payments, quotations, creditNotes, customer]);

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
    fetchQuotations();
    fetchDocuments();
    fetchNotes();
  }, [fetchCustomer, fetchContacts, fetchPaymentMethods, fetchInvoices, fetchPayments, fetchContracts, fetchSubscriptions, fetchCreditNotes, fetchActivity, fetchQuotations, fetchDocuments, fetchNotes]);

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id, fetchCustomer]);

  useEffect(() => {
    if (id && activeTab === 'overview') {
      fetchInvoices();
      fetchPayments();
      fetchActivity();
      fetchNotes();
      fetchQuotations();
    }
  }, [id, activeTab, fetchInvoices, fetchPayments, fetchActivity, fetchNotes, fetchQuotations]);

  useEffect(() => {
    if (id && activeTab === 'contacts') fetchContacts();
  }, [id, activeTab, fetchContacts]);

  useEffect(() => {
    if (id && activeTab === 'payment-methods') fetchPaymentMethods();
  }, [id, activeTab, fetchPaymentMethods]);

  useEffect(() => {
    if (id && activeTab === 'billing-overview') { fetchInvoices(); fetchPayments(); fetchCreditNotes(); }
  }, [id, activeTab, fetchInvoices, fetchPayments, fetchCreditNotes]);

  useEffect(() => {
    if (id && activeTab === 'quotations') fetchQuotations();
  }, [id, activeTab, fetchQuotations]);

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
    if (id && activeTab === 'timeline') {
      setTimelineLoading(true);
      fetchInvoices();
      fetchPayments();
      fetchActivity();
      fetchNotes();
      fetchQuotations();
      fetchCreditNotes();
    }
  }, [id, activeTab, fetchInvoices, fetchPayments, fetchActivity, fetchNotes, fetchQuotations, fetchCreditNotes]);

  useEffect(() => {
    if (activeTab === 'timeline' && !activityLoading && !invoicesLoading && !paymentsLoading && !notesLoading) {
      buildTimeline();
    }
  }, [activeTab, activityLoading, invoicesLoading, paymentsLoading, notesLoading, buildTimeline]);

  useEffect(() => {
    if (id && activeTab === 'documents') fetchDocuments();
  }, [id, activeTab, fetchDocuments]);

  useEffect(() => {
    if (id && activeTab === 'notes') fetchNotes();
  }, [id, activeTab, fetchNotes]);

  const handleSave = async () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editForm.company_name?.trim()) {
      setError("Company name is required");
      return;
    }
    if (editForm.email?.trim() && !emailRe.test(editForm.email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    try {
      setSaving(true);
      const PAYMENT_TERMS_CREDIT_DAYS = { due_on_receipt: 0, net_15: 15, net_30: 30, net_45: 45, net_60: 60, net_90: 90 };
      const payload = { ...editForm };
      if (editForm.shipping_same_as_billing) payload.shipping_address = editForm.billing_address;
      delete payload.shipping_same_as_billing;
      payload.credit_days = editForm.credit_days === "" || editForm.credit_days == null
        ? PAYMENT_TERMS_CREDIT_DAYS[editForm.payment_terms] ?? 30
        : Math.max(0, parseInt(editForm.credit_days, 10) || 0);
      if (editForm.credit_limit === "" || editForm.credit_limit == null) {
        delete payload.credit_limit;
      } else {
        payload.credit_limit = Math.max(0, parseFloat(editForm.credit_limit) || 0);
      }
      await customerApi.update(id, payload);
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
      setContactForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '', department: '', is_primary: false });
      await fetchContacts();
    } catch (err) {
      setContactFormError(err?.detail || err?.message || 'Failed to save contact');
    } finally {
      setContactSaving(false);
    }
  };

  const handleRemoveContact = async (contactId) => {
    if (!window.confirm('Remove this contact? This action cannot be undone.')) return;
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
    if (!window.confirm('Remove this payment method? This action cannot be undone.')) return;
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
    if (!window.confirm('Delete this document? This action cannot be undone.')) return;
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
    if (!window.confirm('Delete this note? This action cannot be undone.')) return;
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

      {/* Business Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding Balance</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{formatDisplayCurrency(customer?.outstanding_balance || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatDisplayCurrency(customer?.total_revenue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Limit</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatDisplayCurrency(customer?.credit_limit || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Invoices</p>
          <p className="text-xl font-bold text-violet-600 mt-1">{customer?.total_invoices || 0}</p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Quick Actions</span>
        <button onClick={() => navigate(`/billing/invoicing?create=1&customer_id=${id}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
          <FileText className="h-3.5 w-3.5" /> Create Invoice
        </button>
        <button onClick={() => navigate(`/billing/quotations?create=1&customer_id=${id}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <FileText className="h-3.5 w-3.5" /> Create Quotation
        </button>
        <button onClick={() => navigate(`/billing/payments?create=1&customer_id=${id}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">
          <CreditCard className="h-3.5 w-3.5" /> Record Payment
        </button>
        <button onClick={() => { setActiveTab('contacts'); setShowContactForm(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Contact
        </button>
        <button onClick={() => { setActiveTab('notes'); setShowNoteForm(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <StickyNote className="h-3.5 w-3.5" /> Add Note
        </button>
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

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Customer Health + Insights Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Health */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><AlertCircle size={14} className="text-violet-500" /> Customer Health</h4>
              {(() => {
                const hasOverdue = invoices.some((i) => i.status === 'overdue');
                const hasUnpaid = invoices.some((i) => i.status === 'unpaid' || i.status === 'sent');
                const nearCreditLimit = customer?.credit_limit > 0 && (customer?.outstanding_balance || 0) / customer.credit_limit >= 0.8;
                const isHealthy = customer?.status === 'active' && !hasOverdue && !nearCreditLimit;
                const needsAttention = customer?.status === 'active' && (hasOverdue || nearCreditLimit);
                let healthStatus, healthColor, healthBg;
                if (customer?.status === 'inactive' || customer?.status === 'suspended') {
                  healthStatus = 'Inactive'; healthColor = 'text-gray-600'; healthBg = 'bg-gray-100';
                } else if (isHealthy) {
                  healthStatus = 'Healthy'; healthColor = 'text-emerald-700'; healthBg = 'bg-emerald-100';
                } else if (needsAttention) {
                  healthStatus = 'Attention Required'; healthColor = 'text-amber-700'; healthBg = 'bg-amber-100';
                } else {
                  healthStatus = 'Pending'; healthColor = 'text-blue-700'; healthBg = 'bg-blue-100';
                }
                return (
                  <>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${healthBg} ${healthColor} mb-3`}>
                      <span className={`w-2 h-2 rounded-full ${healthColor === 'text-emerald-700' ? 'bg-emerald-500' : healthColor === 'text-amber-700' ? 'bg-amber-500' : healthColor === 'text-gray-600' ? 'bg-gray-400' : 'bg-blue-500'}`} />
                      {healthStatus}
                    </div>
                    <div className="space-y-2 text-xs">
                      {customer?.credit_limit > 0 && (
                        <div className="flex justify-between"><span className="text-gray-500">Credit Used</span><span className="font-medium text-gray-800">{((customer.outstanding_balance || 0) / customer.credit_limit * 100).toFixed(0)}%</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-gray-500">Overdue Invoices</span><span className="font-medium text-gray-800">{invoices.filter((i) => i.status === 'overdue').length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Unpaid Invoices</span><span className="font-medium text-gray-800">{invoices.filter((i) => i.status === 'unpaid' || i.status === 'sent').length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Active Contracts</span><span className="font-medium text-gray-800">{contracts.filter((c) => c.status === 'active').length}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Active Subscriptions</span><span className="font-medium text-gray-800">{subscriptions.filter((s) => s.status === 'active').length}</span></div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Customer Insights */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><BarChart3 size={14} className="text-violet-500" /> Insights</h4>
              {(() => {
                const thisYear = new Date().getFullYear();
                const invThisYear = invoices.filter((i) => {
                  const d = i.issue_date || i.created_at; return d && new Date(d).getFullYear() === thisYear;
                });
                const pmtThisYear = payments.filter((p) => {
                  const d = p.payment_date || p.created_at; return d && new Date(d).getFullYear() === thisYear;
                });
                const revenueThisYear = invThisYear.reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
                const avgInvoice = invoices.length > 0 ? invoices.reduce((s, i) => s + Number(i.total || i.amount || 0), 0) / invoices.length : 0;
                const totalPmts = payments.length;
                const successfulPmts = payments.filter((p) => p.status === 'completed' || p.status === 'succeeded').length;
                const successRate = totalPmts > 0 ? (successfulPmts / totalPmts * 100).toFixed(0) : '—';
                return (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">Invoices This Year</span><span className="font-medium text-gray-800">{invThisYear.length}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Payments This Year</span><span className="font-medium text-gray-800">{pmtThisYear.length}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Revenue This Year</span><span className="font-medium text-emerald-700">{formatDisplayCurrency(revenueThisYear)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Avg Invoice Value</span><span className="font-medium text-gray-800">{formatDisplayCurrency(avgInvoice)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Payment Success Rate</span><span className="font-medium text-gray-800">{successRate}{successRate !== '—' ? '%' : ''}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Last Invoice</span><span className="font-medium text-gray-800">{invoices.length > 0 ? formatDisplayDate(invoices[0]?.issue_date || invoices[0]?.created_at) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Last Payment</span><span className="font-medium text-gray-800">{payments.length > 0 ? formatDisplayDate(payments[0]?.payment_date || payments[0]?.created_at) : '—'}</span></div>
                  </div>
                );
              })()}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock size={14} className="text-violet-500" /> Recent Activity</h4>
              {activityLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
              ) : activity.length === 0 && notes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No recent activity</p>
              ) : (
                <div className="space-y-2">
                  {[...activity.slice(0, 3), ...notes.slice(0, 2)].sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)).slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <div className="h-5 w-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="h-3 w-3 text-violet-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">{item.action ? item.action.charAt(0).toUpperCase() + item.action.slice(1) : 'Note'}</p>
                        <p className="text-gray-400">{formatDisplayDate(item.created_at || item.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                  {(activity.length > 3 || notes.length > 2) && (
                    <button onClick={() => setActiveTab('timeline')} className="text-violet-600 hover:text-violet-700 text-xs font-medium">View all →</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Existing Detail Sections */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button onClick={() => { setEditing(false); setEditForm({
                      display_name: customer?.display_name || customer?.company_name || '',
                      company_name: customer?.company_name || '',
                      email: customer?.email || '', phone: customer?.phone || '', website: customer?.website || '',
                      billing_address: customer?.billing_address || '',
                      shipping_address: customer?.shipping_address || '',
                      shipping_same_as_billing: false,
                      gst_number: customer?.gst_number || '', vat_number: customer?.vat_number || '',
                      pan: customer?.pan || '', tin: customer?.tin || '', tax_id: customer?.tax_id || '',
                      currency: customer?.currency || '', payment_terms: customer?.payment_terms || 'net_30',
                      credit_limit: customer?.credit_limit || '', credit_days: customer?.credit_days || '',
                      price_list: customer?.price_list || '', notes: customer?.notes || '',
                    }); }}
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

            {/* Customer Overview Section */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4"><User size={16} className="text-violet-500" /> Customer Overview</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InlineEditField label="Display Name" value={editForm.display_name} editing={editing} onChange={(v) => setEditForm({ ...editForm, display_name: v })} />
                <InlineEditField label="Company Name" value={editForm.company_name} editing={editing} onChange={(v) => setEditForm({ ...editForm, company_name: v })} />
                {!editing && <InlineEditField label="Customer Code" value={customer?.customer_code} editing={false} />}
                <InlineEditField label="Email" value={editForm.email} editing={editing} onChange={(v) => setEditForm({ ...editForm, email: v })} type="email" />
                <InlineEditField label="Phone" value={editForm.phone} editing={editing} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                <InlineEditField label="Website" value={editForm.website} editing={editing} onChange={(v) => setEditForm({ ...editForm, website: v })} />
                {!editing && (
                  <InlineEditField label="Customer Type" value={customer?.customer_type ? customer.customer_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—'} editing={false} />
                )}
              </div>
            </div>

            {/* Billing Profile Section */}
            <div className="mb-8 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4"><CreditCard size={16} className="text-violet-500" /> Billing Profile</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {editing ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Default Currency</label>
                      <select value={editForm.currency}
                        onChange={(v) => setEditForm({ ...editForm, currency: v.target.value })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                        <option value="">Select currency</option>
                        {getCurrencySelectOptions().map((c) => (
                          <option key={c.value} value={c.value}>{c.value} - {c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Terms</label>
                      <select value={editForm.payment_terms}
                        onChange={(v) => {
                          const terms = v.target.value;
                          const TERMS_MAP = { due_on_receipt: 0, net_15: 15, net_30: 30, net_45: 45, net_60: 60, net_90: 90 };
                          setEditForm({ ...editForm, payment_terms: terms, credit_days: TERMS_MAP[terms] ?? 30 });
                        }}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                        <option value="due_on_receipt">Due on Receipt</option>
                        <option value="net_15">Net 15</option>
                        <option value="net_30">Net 30</option>
                        <option value="net_45">Net 45</option>
                        <option value="net_60">Net 60</option>
                        <option value="net_90">Net 90</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Limit</label>
                      <input type="number" min="0" step="0.01" value={editForm.credit_limit}
                        onChange={(v) => setEditForm({ ...editForm, credit_limit: v.target.value })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Days</label>
                      <input type="number" min="0" step="1" value={editForm.credit_days ?? ''}
                        onChange={(v) => setEditForm({ ...editForm, credit_days: v.target.value === '' ? '' : Math.max(0, parseInt(v.target.value, 10) || 0) })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                    </div>
                  </>
                ) : (
                  <>
                    <InlineEditField label="Default Currency" value={customer?.currency || orgConfig?.default_currency || '—'} editing={false} />
                    <InlineEditField label="Payment Terms" value={customer?.payment_terms ? customer.payment_terms.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Net 30'} editing={false} />
                    <InlineEditField label="Credit Limit" value={customer?.credit_limit ? formatDisplayCurrency(customer.credit_limit) : '—'} editing={false} />
                    <InlineEditField label="Credit Days" value={customer?.credit_days || '—'} editing={false} />
                    <InlineEditField label="Price List" value={customer?.price_list || '—'} editing={false} />
                  </>
                )}
              </div>
            </div>

            {/* Addresses Section */}
            <div className="mb-8 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4"><MapPin size={16} className="text-violet-500" /> Addresses</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {editing ? (
                    <>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Address</label>
                      <textarea rows={3} value={editForm.billing_address}
                        onChange={(v) => setEditForm({ ...editForm, billing_address: v.target.value })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                    </>
                  ) : (
                    <InlineEditField label="Billing Address" value={customer?.billing_address || '—'} editing={false} />
                  )}
                </div>
                <div>
                  {editing ? (
                    <>
                      <label className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <input type="checkbox" checked={editForm.shipping_same_as_billing}
                          onChange={(e) => setEditForm({ ...editForm, shipping_same_as_billing: e.target.checked, shipping_address: e.target.checked ? editForm.billing_address : (customer?.shipping_address || '') })}
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                        Same as Billing Address
                      </label>
                      {!editForm.shipping_same_as_billing && (
                        <>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping Address</label>
                          <textarea rows={3} value={editForm.shipping_address}
                            onChange={(v) => setEditForm({ ...editForm, shipping_address: v.target.value })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                        </>
                      )}
                    </>
                  ) : (
                    <InlineEditField label="Shipping Address" value={customer?.shipping_address === customer?.billing_address && customer?.shipping_address ? 'Same as Billing Address' : (customer?.shipping_address || '—')} editing={false} />
                  )}
                </div>
              </div>
            </div>

            {/* Tax Information Section */}
            <div className="mb-8 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4"><Building2 size={16} className="text-violet-500" /> Tax Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InlineEditField label="GST Number" value={editForm.gst_number} editing={editing} onChange={(v) => setEditForm({ ...editForm, gst_number: v })} />
                <InlineEditField label="VAT Number" value={editForm.vat_number} editing={editing} onChange={(v) => setEditForm({ ...editForm, vat_number: v })} />
                <InlineEditField label="PAN" value={editForm.pan} editing={editing} onChange={(v) => setEditForm({ ...editForm, pan: v })} />
                <InlineEditField label="TIN" value={editForm.tin} editing={editing} onChange={(v) => setEditForm({ ...editForm, tin: v })} />
                <InlineEditField label="Tax ID" value={editForm.tax_id} editing={editing} onChange={(v) => setEditForm({ ...editForm, tax_id: v })} />
                {editing && <div />}
              </div>
            </div>

            {/* Account Summary Section */}
            <div className="pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Account Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{formatDisplayDate(customer?.created_at || customer?.createdAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{formatDisplayDate(customer?.updated_at || customer?.updatedAt)}</p>
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

            {customer?.notes && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
                {editing ? (
                  <textarea rows={2} value={editForm.notes}
                    onChange={(v) => setEditForm({ ...editForm, notes: v.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{customer?.notes || '—'}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
            <button onClick={() => { setShowContactForm(true); setEditingContactId(null); setContactForm({ first_name: '', last_name: '', email: '', phone: '', job_title: '', department: '', is_primary: false }); }}
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
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <select value={contactForm.department} onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                    <option value="">Select department</option>
                    <option value="Billing">Billing</option>
                    <option value="Finance">Finance</option>
                    <option value="Purchasing">Purchasing</option>
                    <option value="Technical">Technical</option>
                    <option value="Management">Management</option>
                    <option value="Other">Other</option>
                  </select>
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
                      <p className="text-xs text-gray-500">{contact.email}{contact.phone ? ` · ${contact.phone}` : ''}{contact.job_title ? ` · ${contact.job_title}` : ''}{contact.department ? ` · ${contact.department}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!contact.is_primary && (
                      <button onClick={() => handleSetPrimaryContact(contact.id)} title="Set primary"
                        className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition-colors">
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => { setEditingContactId(contact.id); setContactForm({ first_name: contact.first_name || '', last_name: contact.last_name || '', email: contact.email, phone: contact.phone || '', job_title: contact.job_title || '', department: contact.department || '', is_primary: contact.is_primary || false }); setShowContactForm(true); }}
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

      {activeTab === 'billing-overview' && (
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5"><BarChart3 size={14} className="text-violet-500" /> Billing Summary</h4>
            {(() => {
              const totalOutstanding = invoices.filter((i) => i.status === 'unpaid' || i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
              const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
              const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
              const totalDraft = invoices.filter((i) => i.status === 'draft').reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
              const totalCancelled = invoices.filter((i) => i.status === 'cancelled' || i.status === 'void').reduce((s, i) => s + Number(i.total || i.amount || 0), 0);
              const avgPaymentDays = payments.length > 0 && invoices.length > 0 ? Math.round(payments.reduce((s, p) => {
                const inv = invoices.find((i) => i.id === p.invoice_id);
                if (inv && inv.issue_date && p.payment_date) {
                  return s + Math.round((new Date(p.payment_date) - new Date(inv.issue_date)) / (1000 * 60 * 60 * 24));
                }
                return s;
              }, 0) / Math.min(payments.length, invoices.length)) : '—';
              const creditUsed = customer?.credit_limit > 0 ? ((customer.outstanding_balance || 0) / customer.credit_limit * 100).toFixed(0) : '—';
              const availableCredit = customer?.credit_limit > 0 ? Math.max(0, Number(customer.credit_limit) - Number(customer.outstanding_balance || 0)) : '—';
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] font-medium text-gray-500 uppercase">Outstanding</p><p className="text-sm font-bold text-amber-600 mt-0.5">{formatDisplayCurrency(totalOutstanding)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] font-medium text-gray-500 uppercase">Paid</p><p className="text-sm font-bold text-emerald-600 mt-0.5">{formatDisplayCurrency(totalPaid)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] font-medium text-gray-500 uppercase">Overdue</p><p className="text-sm font-bold text-red-600 mt-0.5">{formatDisplayCurrency(totalOverdue)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] font-medium text-gray-500 uppercase">Draft</p><p className="text-sm font-bold text-gray-600 mt-0.5">{formatDisplayCurrency(totalDraft)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] font-medium text-gray-500 uppercase">Cancelled</p><p className="text-sm font-bold text-gray-400 mt-0.5">{formatDisplayCurrency(totalCancelled)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] font-medium text-gray-500 uppercase">Avg Payment Days</p><p className="text-sm font-bold text-gray-800 mt-0.5">{avgPaymentDays !== '—' ? `${avgPaymentDays} days` : '—'}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] font-medium text-gray-500 uppercase">Credit Limit</p><p className="text-sm font-bold text-gray-800 mt-0.5">{formatDisplayCurrency(customer?.credit_limit || 0)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] font-medium text-gray-500 uppercase">Credit Used</p><p className="text-sm font-bold text-gray-800 mt-0.5">{creditUsed !== '—' ? `${creditUsed}%` : '—'}</p></div>
                  <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] font-medium text-gray-500 uppercase">Available Credit</p><p className="text-sm font-bold text-emerald-600 mt-0.5">{availableCredit !== '—' ? formatDisplayCurrency(availableCredit) : '—'}</p></div>
                </div>
              );
            })()}
          </div>

          {/* Invoices */}
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
                    {invoices.slice(0, 20).map((inv) => (
                      <tr key={inv.id || inv._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-900">{inv.invoice_number || inv.number || inv.id}</td>
                        <td className="py-3 px-3 text-gray-500">{formatDisplayDate(inv.issue_date || inv.date || inv.created_at)}</td>
                        <td className="py-3 px-3 text-right font-medium text-gray-900">{formatDisplayCurrency(inv.total || inv.amount || inv.total_amount)}</td>
                        <td className="py-3 px-3 text-center"><InvoiceStatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments */}
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
                    {payments.slice(0, 20).map((p) => (
                      <tr key={p.id || p._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-900">{p.payment_number || p.transaction_id || p.id}</td>
                        <td className="py-3 px-3 text-gray-500">{formatDisplayDate(p.payment_date || p.date || p.created_at)}</td>
                        <td className="py-3 px-3 text-right font-medium text-gray-900">{formatDisplayCurrency(p.amount || p.total_amount)}</td>
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

          {/* Credit Notes */}
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
                        <td className="py-3 px-3 text-gray-500">{formatDisplayDate(cn.issue_date || cn.date || cn.created_at)}</td>
                        <td className="py-3 px-3 text-right font-medium text-gray-900">{formatDisplayCurrency(cn.total || cn.amount || cn.total_amount)}</td>
                        <td className="py-3 px-3 text-gray-500">{cn.reason || cn.description || '—'}</td>
                        <td className="py-3 px-3 text-center"><InvoiceStatusBadge status={cn.status} /></td>
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
                      <td className="py-3 px-3 text-gray-500">{formatDisplayDate(c.start_date || c.startDate)}</td>
                      <td className="py-3 px-3 text-gray-500">{formatDisplayDate(c.end_date || c.endDate)}</td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">{formatDisplayCurrency(c.value || c.total_value || c.contract_value)}</td>
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
                      <td className="py-3 px-3 text-gray-500">{formatDisplayDate(sub.start_date || sub.startDate)}</td>
                      <td className="py-3 px-3 text-gray-500">{formatDisplayDate(sub.next_billing_date || sub.nextBillingDate)}</td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">{formatDisplayCurrency(sub.amount || sub.price || sub.recurring_amount)}</td>
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
                      <td className="py-3 px-3 text-gray-500">{formatDisplayDate(cn.issue_date || cn.date || cn.created_at)}</td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">{formatDisplayCurrency(cn.total || cn.amount || cn.total_amount)}</td>
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

      {activeTab === 'timeline' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Customer Timeline</h3>
          </div>
          {timelineLoading ? (
            <Spinner />
          ) : timeline.length === 0 ? (
            <EmptyState icon={Clock} title="No timeline events" message="Events will appear here as activity happens." />
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {timeline.slice(0, 50).map((event, idx) => {
                  const typeStyles = {
                    customer: 'bg-violet-100 text-violet-600',
                    invoice: 'bg-blue-100 text-blue-600',
                    payment: 'bg-emerald-100 text-emerald-600',
                    quotation: 'bg-purple-100 text-purple-600',
                    credit_note: 'bg-amber-100 text-amber-600',
                    note: 'bg-gray-100 text-gray-600',
                    activity: 'bg-slate-100 text-slate-600',
                  };
                  const dotColor = typeStyles[event.type] || 'bg-gray-100 text-gray-600';
                  return (
                    <li key={idx}>
                      <div className="relative pb-8">
                        {idx < Math.min(timeline.length - 1, 49) && <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />}
                        <div className="relative flex gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white flex-shrink-0 ${dotColor}`}>
                            {event.type === 'payment' ? <CheckCircle className="h-4 w-4" /> :
                             event.type === 'invoice' ? <FileText className="h-4 w-4" /> :
                             event.type === 'quotation' ? <FileText className="h-4 w-4" /> :
                             event.type === 'credit_note' ? <FileText className="h-4 w-4" /> :
                             event.type === 'note' ? <StickyNote className="h-4 w-4" /> :
                             <Clock className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{event.label || 'Event'}</p>
                              <span className="text-xs text-gray-500">{event.date ? formatDisplayDate(event.date) : ''}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {event.description || ''}
                              {event.amount ? ` · ${formatDisplayCurrency(event.amount)}` : ''}
                              {event.actor ? ` · by ${event.actor}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'quotations' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quotations</h3>
            <button onClick={() => navigate(`/billing/quotations?action=create&customer_id=${id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
              <Plus className="h-4 w-4" /> New Quotation
            </button>
          </div>
          {quotationsLoading ? (
            <Spinner />
          ) : quotationsError ? (
            <ErrorState message={quotationsError} onRetry={fetchQuotations} />
          ) : quotations.length === 0 ? (
            <EmptyState icon={FileText} title="No quotations" message="This customer has no quotations." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Quotation</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id || q._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">{q.quotation_number || q.number || q.id}</td>
                      <td className="py-3 px-3 text-gray-500">{formatDisplayDate(q.issue_date || q.date || q.created_at)}</td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">{formatDisplayCurrency(q.total || q.amount || q.total_amount)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                          q.status === 'pending' || q.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          q.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                          q.status === 'rejected' || q.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          q.status === 'converted' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {q.status ? q.status.charAt(0).toUpperCase() + q.status.slice(1) : 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                        {note.created_at ? formatDisplayDate(note.created_at) : ''}
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
