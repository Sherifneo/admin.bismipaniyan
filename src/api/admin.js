import { GET, POST, PUT, DEL, downloadFile } from "./client";

export const authApi = {
  login: (email, password) => POST("/api/admin/auth/login", { email, password }, { noAuth: true }),
  logout: () => POST("/api/admin/auth/logout"),
  me: () => GET("/api/admin/auth/me"),
  changePassword: (current_password, new_password) => POST("/api/admin/auth/change-password", { current_password, new_password }),
};

export const dashboardApi = {
  getStats: (periodDays) => GET(`/api/admin/dashboard?period=${periodDays}`),
};

export const globalSearchApi = {
  search: (q) => GET(`/api/admin/global-search?${new URLSearchParams({ q })}`),
  getTransaction: (universalTransId) => GET(`/api/admin/global-search/transaction/${encodeURIComponent(universalTransId)}`),
};

export const locationsApi = {
  list: () => GET("/api/admin/locations"),
  summary: (id) => GET(`/api/admin/locations/${id}/summary`),
  create: (body) => POST("/api/admin/locations", body),
  update: (id, body) => PUT(`/api/admin/locations/${id}`, body),
};

export const productsApi = {
  list: (params = {}) => GET(`/api/admin/products?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/products", body),
  update: (id, body) => PUT(`/api/admin/products/${id}`, body),
  remove: (id) => DEL(`/api/admin/products/${id}`),
  setLock: (id, isLocked) => PUT(`/api/admin/products/${id}/lock`, { is_locked: isLocked }),
};

export const uomsApi = {
  list: (params = {}) => GET(`/api/admin/uoms?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/uoms", body),
  update: (id, body) => PUT(`/api/admin/uoms/${id}`, body),
  remove: (id) => DEL(`/api/admin/uoms/${id}`),
};

export const bomsApi = {
  list: (params = {}) => GET(`/api/admin/boms?${new URLSearchParams(cleanParams(params))}`),
  get: (id) => GET(`/api/admin/boms/${id}`),
  create: (body) => POST("/api/admin/boms", body),
  update: (id, body) => PUT(`/api/admin/boms/${id}`, body),
  approve: (id) => PUT(`/api/admin/boms/${id}/approve`),
  remove: (id) => DEL(`/api/admin/boms/${id}`),
  setLock: (id, isLocked) => PUT(`/api/admin/boms/${id}/lock`, { is_locked: isLocked }),
};

export const cashbookApi = {
  list: (params = {}) => GET(`/api/admin/cashbook?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/cashbook", body),
  remove: (id, reason) => DEL(`/api/admin/cashbook/${id}`, { reason }),
  restore: (id) => POST(`/api/admin/cashbook/${id}/restore`),
  approve: (id) => PUT(`/api/admin/cashbook/${id}/approve`),
  reverse: (id, body) => POST(`/api/admin/cashbook/${id}/reverse`, body),
  listReversals: (params = {}) => GET(`/api/admin/cashbook/reversals?${new URLSearchParams(cleanParams(params))}`),
};

export const cashbookCategoriesApi = {
  list: (params = {}) => GET(`/api/admin/cashbook-categories?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/cashbook-categories", body),
  update: (id, body) => PUT(`/api/admin/cashbook-categories/${id}`, body),
  remove: (id) => DEL(`/api/admin/cashbook-categories/${id}`),
};

export const positionsApi = {
  list: (params = {}) => GET(`/api/admin/positions?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/positions", body),
  update: (id, body) => PUT(`/api/admin/positions/${id}`, body),
  remove: (id) => DEL(`/api/admin/positions/${id}`),
};

export const inventoryApi = {
  list: (params = {}) => GET(`/api/admin/inventory?${new URLSearchParams(cleanParams(params))}`),
  movements: (params = {}) => GET(`/api/admin/inventory/movements?${new URLSearchParams(cleanParams(params))}`),
  transactions: (params = {}) => GET(`/api/admin/inventory/transactions?${new URLSearchParams(cleanParams(params))}`),
  recordMovement: (body) => POST("/api/admin/inventory/movements", body),
};

export const waOrdersApi = {
  list: (params = {}) => GET(`/api/admin/wa-orders?${new URLSearchParams(cleanParams(params))}`),
  updateStatus: (id, status) => PUT(`/api/admin/wa-orders/${id}`, { status }),
};

export const partnersApi = {
  list: (params = {}) => GET(`/api/admin/partners?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/partners", body),
  update: (id, body) => PUT(`/api/admin/partners/${id}`, body),
  remove: (id) => DEL(`/api/admin/partners/${id}`),
  listSettlements: (partnerId, params = {}) => GET(`/api/admin/partners/${partnerId}/settlements?${new URLSearchParams(cleanParams(params))}`),
  createSettlement: (partnerId, body) => POST(`/api/admin/partners/${partnerId}/settlements`, body),
  updateSettlementStatus: (settlementId, status) => PUT(`/api/admin/partners/settlements/${settlementId}/status`, { status }),
  receiveStock: (partnerId, body) => POST(`/api/admin/partners/${partnerId}/receive-stock`, body),
  payableBalance: (partnerId) => GET(`/api/admin/partners/${partnerId}/payable-balance`),
  payOut: (partnerId, body) => POST(`/api/admin/partners/${partnerId}/pay-out`, body),
};

export const vendorsApi = {
  list: (params = {}) => GET(`/api/admin/vendors?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/vendors", body),
  update: (id, body) => PUT(`/api/admin/vendors/${id}`, body),
  remove: (id) => DEL(`/api/admin/vendors/${id}`),
};

export const purchasingApi = {
  list: (params = {}) => GET(`/api/admin/purchase-orders?${new URLSearchParams(cleanParams(params))}`),
  get: (id) => GET(`/api/admin/purchase-orders/${id}`),
  create: (body) => POST("/api/admin/purchase-orders", body),
  update: (id, body) => PUT(`/api/admin/purchase-orders/${id}`, body),
  pay: (id) => POST(`/api/admin/purchase-orders/${id}/pay`),
};

export const salesOrdersApi = {
  list: (params = {}) => GET(`/api/admin/sales-orders?${new URLSearchParams(cleanParams(params))}`),
  get: (id) => GET(`/api/admin/sales-orders/${id}`),
  create: (body) => POST("/api/admin/sales-orders", body),
  update: (id, body) => PUT(`/api/admin/sales-orders/${id}`, body),
  complete: (id) => POST(`/api/admin/sales-orders/${id}/complete`),
  cancel: (id) => POST(`/api/admin/sales-orders/${id}/cancel`),
  downloadInvoice: (id) => downloadFile(`/api/admin/sales-orders/${id}/invoice`),
};

export const customersApi = {
  list: (params = {}) => GET(`/api/admin/customers?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/customers", body),
  update: (id, body) => PUT(`/api/admin/customers/${id}`, body),
  remove: (id) => DEL(`/api/admin/customers/${id}`),
  walkinFor: (locationId) =>
    GET(`/api/admin/customers?${new URLSearchParams({ includeWalkins: "true", locationId })}`),
};

export const bankAccountsApi = {
  list: (params = {}) => GET(`/api/admin/bank-accounts?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/bank-accounts", body),
  update: (id, body) => PUT(`/api/admin/bank-accounts/${id}`, body),
  listTransactions: (accountId, params = {}) => GET(`/api/admin/bank-accounts/${accountId}/transactions?${new URLSearchParams(cleanParams(params))}`),
  addTransaction: (accountId, body) => POST(`/api/admin/bank-accounts/${accountId}/transactions`, body),
  approveTransaction: (accountId, txnId) => PUT(`/api/admin/bank-accounts/${accountId}/transactions/${txnId}/approve`),
  reverseTransaction: (accountId, txnId, body) => POST(`/api/admin/bank-accounts/${accountId}/transactions/${txnId}/reverse`, body),
};

export const financialControlApi = {
  getSummary: () => GET("/api/admin/financial-control/summary"),
  transfer: (body) => POST("/api/admin/financial-control/transfer", body),
};

export const financialAccountsApi = {
  list: (params = {}) => GET(`/api/admin/financial-accounts?${new URLSearchParams(cleanParams(params))}`),
  balances: () => GET("/api/admin/financial-accounts/balances"),
};

export const bankTransactionsApi = {
  list: (params = {}) => GET(`/api/admin/bank-transactions?${new URLSearchParams(cleanParams(params))}`),
};

export const financialDimensionsApi = {
  list: (params = {}) => GET(`/api/admin/financial-dimensions?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/financial-dimensions", body),
  update: (id, body) => PUT(`/api/admin/financial-dimensions/${id}`, body),
  remove: (id) => DEL(`/api/admin/financial-dimensions/${id}`),
};

export const financialReconciliationApi = {
  calculate: (body) => POST("/api/admin/financial-reconciliation/calculate", body),
  create: (body) => POST("/api/admin/financial-reconciliation", body),
  reconcile: (id) => PUT(`/api/admin/financial-reconciliation/${id}/reconcile`),
  approve: (id) => PUT(`/api/admin/financial-reconciliation/${id}/approve`),
  list: (params = {}) => GET(`/api/admin/financial-reconciliation?${new URLSearchParams(cleanParams(params))}`),
  get: (id) => GET(`/api/admin/financial-reconciliation/${id}`),
};

export const stockTransfersApi = {
  list: (params = {}) => GET(`/api/admin/stock-transfers?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/stock-transfers", body),
  complete: (id) => PUT(`/api/admin/stock-transfers/${id}/complete`),
  cancel: (id) => PUT(`/api/admin/stock-transfers/${id}/cancel`),
};

export const productionApi = {
  listRuns: (params = {}) => GET(`/api/admin/production-runs?${new URLSearchParams(cleanParams(params))}`),
  getRun: (id) => GET(`/api/admin/production-runs/${id}`),
  createRun: (body) => POST("/api/admin/production-runs", body),
  updateRun: (id, body) => PUT(`/api/admin/production-runs/${id}`, body),
  costPreview: (id, params) => GET(`/api/admin/production-runs/${id}/cost-preview?${new URLSearchParams(cleanParams(params))}`),
  lastHours: (productId) => GET(`/api/admin/production-runs/last-hours?${new URLSearchParams({ product_id: productId })}`),
  updateStage: (runId, stage, body) => PUT(`/api/admin/production-runs/${runId}/stages/${stage}`, body),
};

export const machinesApi = {
  list: (params = {}) => GET(`/api/admin/machines?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/machines", body),
  update: (id, body) => PUT(`/api/admin/machines/${id}`, body),
  remove: (id) => DEL(`/api/admin/machines/${id}`),
};

export const costParametersApi = {
  list: () => GET("/api/admin/cost-parameters"),
  create: (body) => POST("/api/admin/cost-parameters", body),
  update: (id, body) => PUT(`/api/admin/cost-parameters/${id}`, body),
  remove: (id) => DEL(`/api/admin/cost-parameters/${id}`),
  history: (id) => GET(`/api/admin/cost-parameters/${id}/history`),
};

export const teamApi = {
  list: () => GET("/api/admin/team"),
  create: (body) => POST("/api/admin/team", body),
  update: (id, body) => PUT(`/api/admin/team/${id}`, body),
};

export const workflowsApi = {
  list: () => GET("/api/admin/workflows"),
  update: (key, body) => PUT(`/api/admin/workflows/${key}`, body),
};

export const reportsApi = {
  cashbookSummary: (params = {}) => GET(`/api/admin/reports/cashbook-summary?${new URLSearchParams(cleanParams(params))}`),
  stockMovements: (params = {}) => GET(`/api/admin/reports/stock-movements?${new URLSearchParams(cleanParams(params))}`),
  purchaseOrdersByStatus: (params = {}) => GET(`/api/admin/reports/purchase-orders-by-status?${new URLSearchParams(cleanParams(params))}`),
  financialDimensionSummary: (params = {}) => GET(`/api/admin/reports/financial-dimension-summary?${new URLSearchParams(cleanParams(params))}`),
};

export const settingsApi = {
  get: () => GET("/api/admin/settings"),
  update: (body) => PUT("/api/admin/settings", body),
};

export const numberSequencesApi = {
  list: () => GET("/api/admin/number-sequences"),
  preview: (key) => GET(`/api/admin/number-sequences/${key}/preview`),
  update: (key, body) => PUT(`/api/admin/number-sequences/${key}`, body),
  checkCollisions: (key, body) => POST(`/api/admin/number-sequences/${key}/check-collisions`, body),
  reset: (key) => POST(`/api/admin/number-sequences/${key}/reset`),
  lastRecord: (key) => GET(`/api/admin/number-sequences/${key}/last-record`),
  clearLast: (key, pk) => POST(`/api/admin/number-sequences/${key}/clear-last`, { pk }),
  sync: (key) => POST(`/api/admin/number-sequences/${key}/sync`),
};

export const companySettingsApi = {
  get: () => GET("/api/admin/company-settings"),
  update: (body) => PUT("/api/admin/company-settings", body),
};

export const securityApi = {
  getRoles: (adminId) => GET(`/api/admin/security/roles/${adminId}`),
  updateRoles: (adminId, body) => PUT(`/api/admin/security/roles/${adminId}`, body),
};

export const activityLogApi = {
  list: (params = {}) => GET(`/api/admin/activity-log?${new URLSearchParams(cleanParams(params))}`),
};

export const employeesApi = {
  list: (params = {}) => GET(`/api/admin/employees?${new URLSearchParams(cleanParams(params))}`),
  get: (id) => GET(`/api/admin/employees/${id}`),
  create: (body) => POST("/api/admin/employees", body),
  update: (id, body) => PUT(`/api/admin/employees/${id}`, body),
  listSalaryPayments: (id) => GET(`/api/admin/employees/${id}/salary-payments`),
};

export const salaryPaymentsApi = {
  list: (params = {}) => GET(`/api/admin/salary-payments?${new URLSearchParams(cleanParams(params))}`),
  pay: (body) => POST("/api/admin/salary-payments", body),
};

// Drops undefined/null/empty-string values before building a query string,
// so optional filters don't show up as literal "undefined" in the URL.
function cleanParams(params) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out;
}
