import { useState, useCallback, useEffect, useRef } from "react";
import {
  settingsApi,
  dashboardApi,
  customerApi,
  productApi,
  pricingApi,
  contractApi,
  quoteApi,
  invoiceApi,
  subscriptionApi,
  paymentApi,
  taxApi,
  creditNoteApi,
  refundApi,
  dunningApi,
  collectionApi,
  revenueApi,
  auditApi,
} from "../service/billingService";

function parsePaginationResponse(response) {
  if (!response) return { items: [], total: 0, page: 1, per_page: 20 };
  return {
    items: response.items ?? response.data ?? response,
    total: response.total ?? (response.data?.length ?? 0),
    page: response.page ?? 1,
    per_page: response.per_page ?? 20,
  };
}

class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function parseApiError(error) {
  if (error instanceof ApiError) return error;
  if (error?.status) {
    return new ApiError(
      error.message || `Request failed with status ${error.status}`,
      error.status,
      error.detail || error.message
    );
  }
  return new ApiError(
    error?.message || "An unexpected error occurred",
    0,
    error
  );
}

function getErrorMessage(error) {
  if (!error) return "An unexpected error occurred";
  if (typeof error === "string") return error;
  if (error.detail) {
    if (Array.isArray(error.detail)) {
      return error.detail.map((e) => {
        const field = e.loc ? e.loc[e.loc.length - 1] : "Field";
        return `${field}: ${e.msg}`;
      }).join(", ");
    }
    if (typeof error.detail === "object") return JSON.stringify(error.detail);
    return error.detail;
  }
  return error.message || "An unexpected error occurred";
}

function useBaseApi(fetchFn, options = {}) {
  const { immediate = false, initialParams = {}, transformResponse } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  const execute = useCallback(
    async (params = {}) => {
      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const response = await fetchFn({ ...initialParams, ...params });
        if (!mountedRef.current || fetchId !== fetchIdRef.current) return;
        const transformed = transformResponse
          ? transformResponse(response)
          : response;
        if (response?.total !== undefined) {
          setData(transformed?.items ?? transformed ?? []);
          setPagination(parsePaginationResponse(response));
        } else {
          setData(transformed);
          setPagination(null);
        }
      } catch (err) {
        if (!mountedRef.current || fetchId !== fetchIdRef.current) return;
        const apiError = parseApiError(err);
        setError(getErrorMessage(apiError));
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [fetchFn, initialParams, transformResponse]
  );

  const refetch = useCallback((params) => execute(params), [execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setPagination(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (immediate) execute();
  }, [immediate, execute]);

  return { data, loading, error, pagination, execute, refetch, reset, setData };
}

export function useMutation(mutationFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const result = await mutationFn(...args);
        setData(result);
        return result;
      } catch (err) {
        const apiError = parseApiError(err);
        const message = getErrorMessage(apiError);
        setError(message);
        throw apiError;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, loading, error, data, reset };
}

// Dashboard hooks
export function useDashboard() {
  return useBaseApi(() => dashboardApi.getFull(), { immediate: true });
}
export function useDashboardKPIs() {
  return useBaseApi(() => dashboardApi.getKPIs(), { immediate: true });
}
export function useMonthlyRevenue(months = 12) {
  return useBaseApi(() => dashboardApi.getMonthlyRevenue(months), { immediate: true });
}

// Customer hooks
export function useCustomers(immediate = true) {
  return useBaseApi((params) => customerApi.list(params), { immediate });
}
export function useCustomer(id) {
  return useBaseApi(() => customerApi.get(id), { immediate: !!id });
}
export function useCustomerSearch() {
  return useBaseApi((params) => customerApi.search(params.term, params.limit), { immediate: false });
}
export function useCustomerContacts(customerId) {
  return useBaseApi(() => customerApi.listContacts(customerId), { immediate: !!customerId });
}

// Product hooks
export function useProducts(immediate = true) {
  return useBaseApi((params) => productApi.list(params), { immediate });
}
export function useProduct(id) {
  return useBaseApi(() => productApi.get(id), { immediate: !!id });
}
export function useProductCategories() {
  return useBaseApi(() => productApi.listCategories(), { immediate: true });
}
export function useSubscribableProducts() {
  return useBaseApi(() => productApi.listSubscribable(), { immediate: true });
}
export function useUsageBillableProducts() {
  return useBaseApi(() => productApi.listUsageBillable(), { immediate: true });
}

// Pricing hooks
export function usePricingPlans(immediate = true) {
  return useBaseApi((params) => pricingApi.list(params), { immediate });
}
export function usePricingPlan(id) {
  return useBaseApi(() => pricingApi.get(id), { immediate: !!id });
}
export function usePricingPlansByProduct(productId) {
  return useBaseApi(() => pricingApi.listByProduct(productId), { immediate: !!productId });
}
export function usePlanTiers(planId) {
  return useBaseApi(() => pricingApi.listTiers(planId), { immediate: !!planId });
}

// Contract hooks
export function useContracts(immediate = true) {
  return useBaseApi((params) => contractApi.list(params), { immediate });
}
export function useContract(id) {
  return useBaseApi(() => contractApi.get(id), { immediate: !!id });
}
export function useActiveContracts() {
  return useBaseApi(() => contractApi.listActive(), { immediate: true });
}
export function useExpiringContracts(withinDays = 30) {
  return useBaseApi(() => contractApi.listExpiring(withinDays), { immediate: true });
}

// Quote hooks
export function useQuotes(immediate = true) {
  return useBaseApi((params) => quoteApi.list(params), { immediate });
}
export function useQuote(id) {
  return useBaseApi(() => quoteApi.get(id), { immediate: !!id });
}
export function useQuoteItems(quoteId) {
  return useBaseApi(() => quoteApi.listItems(quoteId), { immediate: !!quoteId });
}

// Invoice hooks
export function useInvoices(immediate = true) {
  return useBaseApi((params) => invoiceApi.list(params), { immediate });
}
export function useInvoice(id) {
  return useBaseApi(() => invoiceApi.get(id), { immediate: !!id });
}
export function useInvoiceDashboardStats() {
  return useBaseApi(() => invoiceApi.getDashboardStats(), { immediate: true });
}
export function useOutstandingTotal() {
  return useBaseApi(() => invoiceApi.getOutstandingTotal(), { immediate: true });
}
export function useInvoiceItems(invoiceId) {
  return useBaseApi(() => invoiceApi.listItems(invoiceId), { immediate: !!invoiceId });
}
export function useOverdueInvoices() {
  return useBaseApi(() => invoiceApi.listOverdue(), { immediate: true });
}

// Subscription hooks
export function useSubscriptions(immediate = true) {
  return useBaseApi((params) => subscriptionApi.list(params), { immediate });
}
export function useSubscription(id) {
  return useBaseApi(() => subscriptionApi.get(id), { immediate: !!id });
}
export function useActiveSubscriptions() {
  return useBaseApi(() => subscriptionApi.listActive(), { immediate: true });
}
export function useSubscriptionPlans(immediate = true) {
  return useBaseApi((params) => subscriptionApi.listPlans(params), { immediate });
}
export function usePublicPlans() {
  return useBaseApi(() => subscriptionApi.listPublicPlans(), { immediate: true });
}
export function useSubscriptionEvents(subscriptionId) {
  return useBaseApi(() => subscriptionApi.listEvents(subscriptionId), { immediate: !!subscriptionId });
}

// Payment hooks
export function usePayments(immediate = true) {
  return useBaseApi((params) => paymentApi.list(params), { immediate });
}
export function usePayment(id) {
  return useBaseApi(() => paymentApi.get(id), { immediate: !!id });
}
export function usePaymentMethods(customerId) {
  return useBaseApi(() => paymentApi.listMethods(customerId), { immediate: !!customerId });
}
export function useTotalCollected() {
  return useBaseApi(() => paymentApi.getTotalCollected(), { immediate: true });
}
export function usePaymentAllocations(paymentId) {
  return useBaseApi(() => paymentApi.listAllocations(paymentId), { immediate: !!paymentId });
}
export function usePaymentAttempts(paymentId) {
  return useBaseApi(() => paymentApi.listAttempts(paymentId), { immediate: !!paymentId });
}

// Tax hooks
export function useTaxRates(immediate = true) {
  return useBaseApi((params) => taxApi.list(params), { immediate });
}
export function useTaxRate(id) {
  return useBaseApi(() => taxApi.get(id), { immediate: !!id });
}
export function useApplicableTaxRates(taxableType = "both") {
  return useBaseApi(() => taxApi.getApplicable(taxableType), { immediate: true });
}
export function useTaxSummary() {
  return useBaseApi((params) => taxApi.getSummary(params.date_from, params.date_to), { immediate: false });
}

// Credit Note hooks
export function useCreditNotes(immediate = true) {
  return useBaseApi((params) => creditNoteApi.list(params), { immediate });
}
export function useCreditNote(id) {
  return useBaseApi(() => creditNoteApi.get(id), { immediate: !!id });
}
export function useOutstandingCredits() {
  return useBaseApi(() => creditNoteApi.getOutstanding(), { immediate: true });
}
export function useCreditNoteApplications(creditNoteId) {
  return useBaseApi(() => creditNoteApi.listApplications(creditNoteId), { immediate: !!creditNoteId });
}

// Refund hooks
export function useRefunds(immediate = true) {
  return useBaseApi((params) => refundApi.list(params), { immediate });
}
export function useRefund(id) {
  return useBaseApi(() => refundApi.get(id), { immediate: !!id });
}

// Dunning hooks
export function useDunningCases(immediate = true) {
  return useBaseApi((params) => dunningApi.listCases(params), { immediate });
}
export function useDunningCase(id) {
  return useBaseApi(() => dunningApi.getCase(id), { immediate: !!id });
}
export function useDunningLevels() {
  return useBaseApi(() => dunningApi.listLevels(), { immediate: true });
}
export function useActiveDunningCases() {
  return useBaseApi(() => dunningApi.listActiveCases(), { immediate: true });
}
export function useDunningReminderSchedule() {
  return useBaseApi(() => dunningApi.getReminderSchedule(), { immediate: true });
}

// Collection hooks
export function useCollectionsCases(immediate = true) {
  return useBaseApi((params) => collectionApi.listCases(params), { immediate });
}
export function useCollectionsCase(id) {
  return useBaseApi(() => collectionApi.getCase(id), { immediate: !!id });
}
export function useAgingBuckets() {
  return useBaseApi(() => collectionApi.getAgingBuckets(), { immediate: true });
}
export function useCollectionsQueue() {
  return useBaseApi(() => collectionApi.getCollectionsQueue(), { immediate: true });
}

// Revenue Recognition hooks
export function useRevenueSchedules(immediate = true) {
  return useBaseApi((params) => revenueApi.listSchedules(params), { immediate });
}
export function useRevenueSchedule(id) {
  return useBaseApi(() => revenueApi.getSchedule(id), { immediate: !!id });
}
export function useTotalDeferred() {
  return useBaseApi(() => revenueApi.getTotalDeferred(), { immediate: true });
}
export function useRevenueEntries(scheduleId) {
  return useBaseApi(() => revenueApi.getEntries(scheduleId), { immediate: !!scheduleId });
}

// Settings hooks
export function useSettings() {
  return useBaseApi(() => settingsApi.get(), { immediate: true });
}

// Audit hooks
export function useAuditLogs(immediate = true) {
  return useBaseApi((params) => auditApi.list(params), { immediate });
}
