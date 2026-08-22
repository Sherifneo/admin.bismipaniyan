import { GET, POST, PUT, DEL } from "./client";

export const authApi = {
  login: (email, password) => POST("/api/admin/auth/login", { email, password }, { noAuth: true }),
  logout: () => POST("/api/admin/auth/logout"),
  me: () => GET("/api/admin/auth/me"),
  changePassword: (current_password, new_password) => POST("/api/admin/auth/change-password", { current_password, new_password }),
};

export const dashboardApi = {
  getStats: (periodDays) => GET(`/api/admin/dashboard?period=${periodDays}`),
};

export const locationsApi = {
  list: () => GET("/api/admin/locations"),
};

export const productsApi = {
  list: (params = {}) => GET(`/api/admin/products?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/products", body),
  update: (id, body) => PUT(`/api/admin/products/${id}`, body),
  remove: (id) => DEL(`/api/admin/products/${id}`),
};

export const cashbookApi = {
  list: (params = {}) => GET(`/api/admin/cashbook?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/cashbook", body),
  remove: (id, reason) => DEL(`/api/admin/cashbook/${id}`, { reason }),
};

export const cashbookCategoriesApi = {
  list: (params = {}) => GET(`/api/admin/cashbook-categories?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/cashbook-categories", body),
  update: (id, body) => PUT(`/api/admin/cashbook-categories/${id}`, body),
  remove: (id) => DEL(`/api/admin/cashbook-categories/${id}`),
};

export const inventoryApi = {
  list: (params = {}) => GET(`/api/admin/inventory?${new URLSearchParams(cleanParams(params))}`),
  movements: (params = {}) => GET(`/api/admin/inventory/movements?${new URLSearchParams(cleanParams(params))}`),
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
};

export const bankAccountsApi = {
  list: (params = {}) => GET(`/api/admin/bank-accounts?${new URLSearchParams(cleanParams(params))}`),
  create: (body) => POST("/api/admin/bank-accounts", body),
  update: (id, body) => PUT(`/api/admin/bank-accounts/${id}`, body),
  listTransactions: (accountId, params = {}) => GET(`/api/admin/bank-accounts/${accountId}/transactions?${new URLSearchParams(cleanParams(params))}`),
  addTransaction: (accountId, body) => POST(`/api/admin/bank-accounts/${accountId}/transactions`, body),
};

export const financialControlApi = {
  getSummary: () => GET("/api/admin/financial-control/summary"),
  transfer: (body) => POST("/api/admin/financial-control/transfer", body),
};

export const productionApi = {
  listRuns: (params = {}) => GET(`/api/admin/production-runs?${new URLSearchParams(cleanParams(params))}`),
  getRun: (id) => GET(`/api/admin/production-runs/${id}`),
  createRun: (body) => POST("/api/admin/production-runs", body),
  updateRun: (id, body) => PUT(`/api/admin/production-runs/${id}`, body),
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
};

export const teamApi = {
  list: () => GET("/api/admin/team"),
  create: (body) => POST("/api/admin/team", body),
  update: (id, body) => PUT(`/api/admin/team/${id}`, body),
};

export const reportsApi = {
  cashbookSummary: (params = {}) => GET(`/api/admin/reports/cashbook-summary?${new URLSearchParams(cleanParams(params))}`),
  stockMovements: (params = {}) => GET(`/api/admin/reports/stock-movements?${new URLSearchParams(cleanParams(params))}`),
  purchaseOrdersByStatus: (params = {}) => GET(`/api/admin/reports/purchase-orders-by-status?${new URLSearchParams(cleanParams(params))}`),
};

export const settingsApi = {
  get: () => GET("/api/admin/settings"),
  update: (body) => PUT("/api/admin/settings", body),
};

export const numberSequencesApi = {
  list: () => GET("/api/admin/number-sequences"),
  update: (key, body) => PUT(`/api/admin/number-sequences/${key}`, body),
  checkCollisions: (key, body) => POST(`/api/admin/number-sequences/${key}/check-collisions`, body),
};

export const securityApi = {
  getRoles: (adminId) => GET(`/api/admin/security/roles/${adminId}`),
  updateRoles: (adminId, body) => PUT(`/api/admin/security/roles/${adminId}`, body),
};

export const activityLogApi = {
  list: (params = {}) => GET(`/api/admin/activity-log?${new URLSearchParams(cleanParams(params))}`),
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
