import { api } from "./api";
import { ENDPOINTS } from "./billingEndpoints";

function buildUrl(base, params = {}) {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return query ? `${base}?${query}` : base;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePricingPlanPayload(data = {}, { isCreate = false } = {}) {
  const billingPeriod = data.billing_period || data.billing_frequency || data.billing_interval || "monthly";
  const pricingModel = data.pricing_model || data.plan_type || "flat";
  const price = data.unit_price ?? data.price;
  const normalized = {
    ...data,
    billing_period: billingPeriod,
    pricing_model: pricingModel,
    unit_price: price,
    flat_fee: data.flat_fee ?? (pricingModel === "flat" ? price : 0),
    setup_fee: data.setup_fee ?? 0,
    trial_days: data.trial_days ?? 0,
    min_quantity: data.min_quantity ?? 1,
    product_id: data.product_id ? Number(data.product_id) : undefined,
  };
  if (data.status) normalized.is_active = data.status === "active";
  if (isCreate) normalized.effective_from = data.effective_from || todayIsoDate();
  if (Object.prototype.hasOwnProperty.call(data, "effective_to")) {
    normalized.effective_to = data.effective_to || null;
  }

  delete normalized.price;
  delete normalized.currency;
  delete normalized.description;
  delete normalized.billing_frequency;
  delete normalized.billing_interval;
  delete normalized.plan_type;
  delete normalized.status;
  return normalized;
}

function normalizePricingPlanResponse(plan = {}) {
  const price = plan.price ?? plan.unit_price ?? plan.flat_fee ?? 0;
  const billingFrequency = plan.billing_frequency || plan.billing_period || "monthly";
  const planType = plan.plan_type || plan.pricing_model || "flat";
  return {
    ...plan,
    price,
    billing_frequency: billingFrequency,
    billing_interval: billingFrequency,
    plan_type: planType,
    status: plan.status || (plan.is_active === false ? "inactive" : "active"),
  };
}

function normalizePricingPlanList(data) {
  if (Array.isArray(data)) return data.map(normalizePricingPlanResponse);
  if (data?.items) {
    return { ...data, items: data.items.map(normalizePricingPlanResponse) };
  }
  return data;
}

export const settingsApi = {
  get: () => api.get(ENDPOINTS.SETTINGS),
  update: (data) => api.put(ENDPOINTS.SETTINGS, data),
  getConfig: () => api.get(ENDPOINTS.SETTINGS_CONFIG),
  updateConfig: (data) => api.put(ENDPOINTS.SETTINGS_CONFIG, data),
  resetConfig: () => api.post(ENDPOINTS.SETTINGS_CONFIG_RESET),
  validateConfig: () => api.get(ENDPOINTS.SETTINGS_CONFIG_VALIDATE),
};

export const dashboardApi = {
  getFull: () => api.get(ENDPOINTS.DASHBOARD),
  getKPIs: () => api.get(ENDPOINTS.DASHBOARD_KPIS),
  getMonthlyRevenue: (months = 12) =>
    api.get(buildUrl(ENDPOINTS.DASHBOARD_REVENUE, { months })),
};

export const customerApi = {
  list: (params) => api.get(buildUrl(ENDPOINTS.CUSTOMERS, params)),
  search: (term, limit = 20) =>
    api.get(buildUrl(ENDPOINTS.CUSTOMER_SEARCH, { term, limit })),
  get: (id) => api.get(ENDPOINTS.CUSTOMER(id)),
  create: (data) => api.post(ENDPOINTS.CUSTOMERS, data),
  update: (id, data) => api.put(ENDPOINTS.CUSTOMER(id), data),
  hardDelete: (id) => api.delete(ENDPOINTS.CUSTOMER_HARD_DELETE(id)),
  activate: (id) => api.put(ENDPOINTS.CUSTOMER_ACTIVATE(id)),
  deactivate: (id) => api.put(ENDPOINTS.CUSTOMER_DEACTIVATE(id)),
  suspend: (id) => api.put(ENDPOINTS.CUSTOMER_SUSPEND(id)),
  bulkDelete: (ids) => api.post(ENDPOINTS.CUSTOMER_BULK_DELETE, { ids }),
  bulkStatus: (ids, status) => api.post(ENDPOINTS.CUSTOMER_BULK_STATUS, { ids, status }),
  exportData: (format) => api.get(buildUrl(ENDPOINTS.CUSTOMER_EXPORT, { format })),
  importData: (formData) => api.post(ENDPOINTS.CUSTOMER_IMPORT, formData),
  getActivity: (id) => api.get(ENDPOINTS.CUSTOMER_ACTIVITY(id)),
  listContacts: (id) => api.get(ENDPOINTS.CUSTOMER_CONTACTS(id)),
  addContact: (id, data) => api.post(ENDPOINTS.CUSTOMER_CONTACTS(id), data),
  updateContact: (cid, contactId, data) =>
    api.put(ENDPOINTS.CUSTOMER_CONTACT(cid, contactId), data),
  removeContact: (cid, contactId) =>
    api.delete(ENDPOINTS.CUSTOMER_CONTACT(cid, contactId)),
  setPrimaryContact: (cid, contactId) =>
    api.put(ENDPOINTS.CUSTOMER_CONTACT_PRIMARY(cid, contactId)),
  getKPI: () => api.get(ENDPOINTS.CUSTOMER_KPI),
  adjustCreditBalance: (id, data) => api.post(ENDPOINTS.CUSTOMER_CREDIT_BALANCE(id), data),
  listDocuments: (id) => api.get(ENDPOINTS.CUSTOMER_DOCUMENTS(id)),
  addDocument: (id, data) => api.post(ENDPOINTS.CUSTOMER_DOCUMENTS(id), data),
  deleteDocument: (cid, docId) => api.delete(ENDPOINTS.CUSTOMER_DOCUMENT(cid, docId)),
  listNotes: (id) => api.get(ENDPOINTS.CUSTOMER_NOTES(id)),
  addNote: (id, data) => api.post(ENDPOINTS.CUSTOMER_NOTES(id), data),
  updateNote: (cid, noteId, data) => api.put(ENDPOINTS.CUSTOMER_NOTE(cid, noteId), data),
  deleteNote: (cid, noteId) => api.delete(ENDPOINTS.CUSTOMER_NOTE(cid, noteId)),
};

export const productApi = {
  listCategories: (params) =>
    api.get(buildUrl(ENDPOINTS.PRODUCT_CATEGORIES, params)),
  getCategory: (id) => api.get(ENDPOINTS.PRODUCT_CATEGORY(id)),
  createCategory: (data) => api.post(ENDPOINTS.PRODUCT_CATEGORIES, data),
  updateCategory: (id, data) => api.put(ENDPOINTS.PRODUCT_CATEGORY(id), data),
  deleteCategory: (id) => api.delete(ENDPOINTS.PRODUCT_CATEGORY(id)),
  listChildCategories: (parentId) =>
    api.get(ENDPOINTS.PRODUCT_CATEGORY_CHILDREN(parentId)),
  list: (params) => api.get(buildUrl(ENDPOINTS.PRODUCTS, params)),
  get: (id) => api.get(ENDPOINTS.PRODUCT(id)),
  create: (data) => api.post(ENDPOINTS.PRODUCTS, data),
  update: (id, data) => api.put(ENDPOINTS.PRODUCT(id), data),
  delete: (id) => api.delete(ENDPOINTS.PRODUCT(id)),
  restore: (id) => api.post(ENDPOINTS.PRODUCT_RESTORE(id)),
  duplicate: (id) => api.post(ENDPOINTS.PRODUCT_DUPLICATE(id)),
  bulkStatus: (ids, status) => api.post(ENDPOINTS.PRODUCT_BULK_STATUS, { ids, status }),
  bulkDelete: (ids) => api.post(ENDPOINTS.PRODUCT_BULK_DELETE, { ids }),
  listSubscribable: () => api.get(ENDPOINTS.PRODUCT_SUBSCRIBABLE),
  listUsageBillable: () => api.get(ENDPOINTS.PRODUCT_USAGE_BILLABLE),
};

export const pricingApi = {
  list: async (params) => normalizePricingPlanList(await api.get(buildUrl(ENDPOINTS.PRICING_PLANS, params))),
  get: async (id) => normalizePricingPlanResponse(await api.get(ENDPOINTS.PRICING_PLAN(id))),
  create: async (data) =>
    normalizePricingPlanResponse(
      await api.post(ENDPOINTS.PRICING_PLANS, normalizePricingPlanPayload(data, { isCreate: true }))
    ),
  update: async (id, data) =>
    normalizePricingPlanResponse(
      await api.put(ENDPOINTS.PRICING_PLAN(id), normalizePricingPlanPayload(data))
    ),
  deactivate: (id) => api.delete(ENDPOINTS.PRICING_PLAN(id)),
  activate: async (id) =>
    normalizePricingPlanResponse(
      await api.put(ENDPOINTS.PRICING_PLAN(id), { is_active: true })
    ),
  listByProduct: (productId) =>
    api.get(ENDPOINTS.PRICING_PLANS_BY_PRODUCT(productId)).then(normalizePricingPlanList),
  addTier: (planId, data) =>
    api.post(ENDPOINTS.PRICING_PLAN_TIERS(planId), data),
  listTiers: (planId) => api.get(ENDPOINTS.PRICING_PLAN_TIERS(planId)),
  removeTier: (planId, tierId) =>
    api.delete(ENDPOINTS.PRICING_PLAN_TIER(planId, tierId)),
};

export const contractApi = {
  list: (params) => api.get(buildUrl(ENDPOINTS.CONTRACTS, params)),
  listActive: () => api.get(ENDPOINTS.CONTRACTS_ACTIVE),
  listExpiring: (withinDays = 30) =>
    api.get(buildUrl(ENDPOINTS.CONTRACTS_EXPIRING, { within_days: withinDays })),
  get: (id) => api.get(ENDPOINTS.CONTRACT(id)),
  create: (data) => api.post(ENDPOINTS.CONTRACTS, data),
  update: (id, data) => api.put(ENDPOINTS.CONTRACT(id), data),
  activate: (id) => api.put(ENDPOINTS.CONTRACT_ACTIVATE(id)),
  terminate: (id) => api.put(ENDPOINTS.CONTRACT_TERMINATE(id)),
  cancel: (id) => api.put(ENDPOINTS.CONTRACT_CANCEL(id)),
  renew: (id, newEndDate) =>
    api.put(buildUrl(ENDPOINTS.CONTRACT_RENEW(id), { new_end_date: newEndDate })),
};

export const quoteApi = {
  list: (params) => api.get(buildUrl(ENDPOINTS.QUOTATIONS, params)),
  get: (id) => api.get(ENDPOINTS.QUOTATION(id)),
  create: (data) => api.post(ENDPOINTS.QUOTATIONS, data),
  update: (id, data) => api.put(ENDPOINTS.QUOTATION(id), data),
  listItems: (id) => api.get(ENDPOINTS.QUOTATION_ITEMS(id)),
  addItem: (id, data) => api.post(ENDPOINTS.QUOTATION_ITEMS(id), data),
  send: (id) => api.post(ENDPOINTS.QUOTATION_SEND(id)),
  accept: (id) => api.post(ENDPOINTS.QUOTATION_ACCEPT(id)),
  reject: (id, reason) =>
    api.post(buildUrl(ENDPOINTS.QUOTATION_REJECT(id), { reason })),
  cancel: (id) => api.post(ENDPOINTS.QUOTATION_CANCEL(id)),
  convertToInvoice: (id, params) =>
    api.post(buildUrl(ENDPOINTS.QUOTATION_CONVERT(id), params)),
  recalculate: (id) => api.post(ENDPOINTS.QUOTATION_RECALCULATE(id)),
};

export const subscriptionApi = {
  listPlans: (params) =>
    api.get(buildUrl(ENDPOINTS.SUBSCRIPTION_PLANS, params)),
  listPublicPlans: () => api.get(ENDPOINTS.SUBSCRIPTION_PLANS_PUBLIC),
  getPlan: (id) => api.get(ENDPOINTS.SUBSCRIPTION_PLAN(id)),
  createPlan: (data) => api.post(ENDPOINTS.SUBSCRIPTION_PLANS, data),
  updatePlan: (id, data) => api.put(ENDPOINTS.SUBSCRIPTION_PLAN(id), data),
  list: (params) => api.get(buildUrl(ENDPOINTS.SUBSCRIPTIONS, params)),
  listActive: () => api.get(ENDPOINTS.SUBSCRIPTIONS_ACTIVE),
  get: (id) => api.get(ENDPOINTS.SUBSCRIPTION(id)),
  create: (data) => api.post(ENDPOINTS.SUBSCRIPTIONS, data),
  update: (id, data) => api.put(ENDPOINTS.SUBSCRIPTION(id), data),
  activate: (id) => api.post(ENDPOINTS.SUBSCRIPTION_ACTIVATE(id)),
  pause: (id) => api.post(ENDPOINTS.SUBSCRIPTION_PAUSE(id)),
  cancel: (id) => api.post(ENDPOINTS.SUBSCRIPTION_CANCEL(id)),
  changePlan: (id, newPlanId) =>
    api.put(
      buildUrl(ENDPOINTS.SUBSCRIPTION_CHANGE_PLAN(id), {
        new_plan_id: newPlanId,
      })
    ),
  listEvents: (id) => api.get(ENDPOINTS.SUBSCRIPTION_EVENTS(id)),
};

export const invoiceApi = {
  list: (params) => api.get(buildUrl(ENDPOINTS.INVOICES, params)),
  get: (id) => api.get(ENDPOINTS.INVOICE(id)),
  create: (data) => api.post(ENDPOINTS.INVOICES, data),
  update: (id, data) => api.put(ENDPOINTS.INVOICE(id), data),
  listOverdue: () => api.get(ENDPOINTS.INVOICES_OVERDUE),
  getOutstandingTotal: () => api.get(ENDPOINTS.INVOICES_OUTSTANDING_TOTAL),
  getDashboardStats: () => api.get(ENDPOINTS.INVOICES_DASHBOARD_STATS),
  listDueBetween: (startDate, endDate) =>
    api.get(
      buildUrl(ENDPOINTS.INVOICES_DUE_BETWEEN, {
        start_date: startDate,
        end_date: endDate,
      })
    ),
  finalize: (id) => api.post(ENDPOINTS.INVOICE_FINALIZE(id)),
  markSent: (id) => api.post(ENDPOINTS.INVOICE_SEND(id)),
  cancel: (id, reason) =>
    api.post(buildUrl(ENDPOINTS.INVOICE_CANCEL(id), { reason })),
  void: (id, reason) =>
    api.post(buildUrl(ENDPOINTS.INVOICE_VOID(id), { reason })),
  recalculate: (id) => api.post(ENDPOINTS.INVOICE_RECALCULATE(id)),
  listItems: (id) => api.get(ENDPOINTS.INVOICE_ITEMS(id)),
  addItem: (id, data) => api.post(ENDPOINTS.INVOICE_ITEMS(id), data),
  bulkSetItems: (id, items) =>
    api.put(ENDPOINTS.INVOICE_ITEMS(id), { items }),
  listStatusHistory: (id) => api.get(ENDPOINTS.INVOICE_STATUS_HISTORY(id)),
};

export const paymentApi = {
  listMethods: (customerId) =>
    api.get(ENDPOINTS.PAYMENT_METHODS_BY_CUSTOMER(customerId)),
  addMethod: (data) => api.post(ENDPOINTS.PAYMENT_METHODS, data),
  updateMethod: (id, data) => api.put(ENDPOINTS.PAYMENT_METHOD(id), data),
  removeMethod: (id) => api.delete(ENDPOINTS.PAYMENT_METHOD(id)),
  setDefaultMethod: (id) => api.put(ENDPOINTS.PAYMENT_METHOD_DEFAULT(id)),
  list: (params) => api.get(buildUrl(ENDPOINTS.PAYMENTS, params)),
  get: (id) => api.get(ENDPOINTS.PAYMENT(id)),
  create: (data) => api.post(ENDPOINTS.PAYMENTS, data),
  updateStatus: (id, status) =>
    api.put(buildUrl(ENDPOINTS.PAYMENT_STATUS(id), { status })),
  allocate: (id, data) =>
    api.post(ENDPOINTS.PAYMENT_ALLOCATE(id), data),
  listAllocations: (id) => api.get(ENDPOINTS.PAYMENT_ALLOCATIONS(id)),
  listAttempts: (id) => api.get(ENDPOINTS.PAYMENT_ATTEMPTS(id)),
  reconcile: (id) => api.post(ENDPOINTS.PAYMENT_RECONCILE(id)),
  getTotalCollected: () => api.get(ENDPOINTS.PAYMENTS_TOTAL_COLLECTED),
};

export const taxApi = {
  list: (params) => api.get(buildUrl(ENDPOINTS.TAX_RATES, params)),
  get: (id) => api.get(ENDPOINTS.TAX_RATE(id)),
  create: (data) => api.post(ENDPOINTS.TAX_RATES, data),
  update: (id, data) => api.put(ENDPOINTS.TAX_RATE(id), data),
  getApplicable: (taxableType = "both") =>
    api.get(buildUrl(ENDPOINTS.TAX_RATES_APPLICABLE, { taxable_type: taxableType })),
  getSummary: (dateFrom, dateTo) =>
    api.get(
      buildUrl(ENDPOINTS.TAX_RATES_SUMMARY, { date_from: dateFrom, date_to: dateTo })
    ),
  calculate: (taxableAmount, jurisdiction, taxTypeFilter) =>
    api.post(
      buildUrl(ENDPOINTS.TAX_RATES_CALCULATE, {
        taxable_amount: taxableAmount,
        jurisdiction,
        tax_type_filter: taxTypeFilter,
      }), {}
    ),
};

export const creditNoteApi = {
  list: (params) => api.get(buildUrl(ENDPOINTS.CREDIT_NOTES, params)),
  get: (id) => api.get(ENDPOINTS.CREDIT_NOTE(id)),
  create: (data) => api.post(ENDPOINTS.CREDIT_NOTES, data),
  update: (id, data) => api.put(ENDPOINTS.CREDIT_NOTE(id), data),
  getOutstanding: () => api.get(ENDPOINTS.CREDIT_NOTES_OUTSTANDING),
  issue: (id) => api.post(ENDPOINTS.CREDIT_NOTE_ISSUE(id)),
  void: (id, reason) =>
    api.post(buildUrl(ENDPOINTS.CREDIT_NOTE_VOID(id), { reason })),
  applyToInvoice: (id, data) =>
    api.post(ENDPOINTS.CREDIT_NOTE_APPLY(id), data),
  listApplications: (id) => api.get(ENDPOINTS.CREDIT_NOTE_APPLICATIONS(id)),
};

export const refundApi = {
  list: (params) => api.get(buildUrl(ENDPOINTS.REFUNDS, params)),
  get: (id) => api.get(ENDPOINTS.REFUND(id)),
  create: (data) => api.post(ENDPOINTS.REFUNDS, data),
  process: (id, gatewayRefundId) =>
    api.post(
      buildUrl(ENDPOINTS.REFUND_PROCESS(id), {
        gateway_refund_id: gatewayRefundId,
      })
    ),
  complete: (id) => api.post(ENDPOINTS.REFUND_COMPLETE(id)),
  fail: (id, failureReason) =>
    api.post(
      buildUrl(ENDPOINTS.REFUND_FAIL(id), { failure_reason: failureReason })
    ),
};

export const dunningApi = {
  listLevels: () => api.get(ENDPOINTS.DUNNING_LEVELS),
  getLevel: (id) => api.get(ENDPOINTS.DUNNING_LEVEL(id)),
  createLevel: (data) => api.post(ENDPOINTS.DUNNING_LEVELS, data),
  updateLevel: (id, data) => api.put(ENDPOINTS.DUNNING_LEVEL(id), data),
  deleteLevel: (id) => api.delete(ENDPOINTS.DUNNING_LEVEL(id)),
  listCases: (params) => api.get(buildUrl(ENDPOINTS.DUNNING_CASES, params)),
  listActiveCases: () => api.get(ENDPOINTS.DUNNING_CASES_ACTIVE),
  getCase: (id) => api.get(ENDPOINTS.DUNNING_CASE(id)),
  openCase: (data) =>
    api.post(ENDPOINTS.DUNNING_CASES, {
      customer_id: data.customer_id,
      invoice_id: data.invoice_id,
      total_overdue_amount: data.total_overdue_amount,
      days_overdue: data.days_overdue,
      current_level: data.current_level ?? 1,
      auto_escalate: data.auto_escalate ?? true,
      next_action_at: data.next_action_at ?? null,
      notes: data.notes ?? null,
    }),
  escalateCase: (id) => api.post(ENDPOINTS.DUNNING_CASE_ESCALATE(id)),
  resolveCase: (id, resolutionNote) =>
    api.post(
      buildUrl(ENDPOINTS.DUNNING_CASE_RESOLVE(id), {
        resolution_note: resolutionNote,
      })
    ),
  closeCase: (id) => api.post(ENDPOINTS.DUNNING_CASE_CLOSE(id)),
  getReminderSchedule: () => api.get(ENDPOINTS.DUNNING_SCHEDULE),
  processDunning: () => api.post(ENDPOINTS.DUNNING_PROCESS),
};

export const collectionApi = {
  listCases: (params) =>
    api.get(buildUrl(ENDPOINTS.COLLECTIONS_CASES, params)),
  getCase: (id) => api.get(ENDPOINTS.COLLECTIONS_CASE(id)),
  openCase: (data) => api.post(ENDPOINTS.COLLECTIONS_CASES, data),
  updateCase: (id, data) => api.put(ENDPOINTS.COLLECTIONS_CASE(id), data),
  assignCase: (id, assignedTo) =>
    api.post(
      buildUrl(ENDPOINTS.COLLECTIONS_CASE_ASSIGN(id), {
        assigned_to: assignedTo,
      })
    ),
  resolveCase: (id, resolution) =>
    api.post(
      buildUrl(ENDPOINTS.COLLECTIONS_CASE_RESOLVE(id), { resolution })
    ),
  closeCase: (id) => api.post(ENDPOINTS.COLLECTIONS_CASE_CLOSE(id)),
  escalateCase: (id) => api.post(ENDPOINTS.COLLECTIONS_CASE_ESCALATE(id)),
  logAction: (id, data) =>
    api.post(ENDPOINTS.COLLECTIONS_CASE_ACTIONS(id), data),
  getAgingBuckets: () => api.get(ENDPOINTS.COLLECTIONS_AGING),
  getCollectionsQueue: () => api.get(ENDPOINTS.COLLECTIONS_QUEUE),
};

export const revenueApi = {
  listSchedules: (params) =>
    api.get(buildUrl(ENDPOINTS.REVENUE_SCHEDULES, params)),
  getSchedule: (id) => api.get(ENDPOINTS.REVENUE_SCHEDULE(id)),
  createSchedule: (data) => api.post(ENDPOINTS.REVENUE_SCHEDULES, data),
  updateSchedule: (id, data) => api.put(ENDPOINTS.REVENUE_SCHEDULE(id), data),
  recognizeRevenue: (id, asOfDate) =>
    api.post(
      buildUrl(ENDPOINTS.REVENUE_SCHEDULE_RECOGNIZE(id), {
        as_of_date: asOfDate,
      })
    ),
  getEntries: (id) => api.get(ENDPOINTS.REVENUE_SCHEDULE_ENTRIES(id)),
  getTotalDeferred: () => api.get(ENDPOINTS.REVENUE_DEFERRED),
  recognizeAllPending: (asOfDate) =>
    api.post(
      buildUrl(ENDPOINTS.REVENUE_RECOGNIZE_ALL, { as_of_date: asOfDate })
    ),
};

export const auditApi = {
  list: (params) => api.get(buildUrl(ENDPOINTS.AUDIT_LOGS, params)),
};

export default {
  settings: settingsApi,
  dashboard: dashboardApi,
  customers: customerApi,
  products: productApi,
  pricing: pricingApi,
  contracts: contractApi,
  quotes: quoteApi,
  subscriptions: subscriptionApi,
  invoices: invoiceApi,
  payments: paymentApi,
  tax: taxApi,
  creditNotes: creditNoteApi,
  refunds: refundApi,
  dunning: dunningApi,
  collections: collectionApi,
  revenue: revenueApi,
  audit: auditApi,
};
