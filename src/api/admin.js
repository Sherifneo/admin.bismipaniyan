import { GET, POST, PUT, DEL } from "./client";

export const authApi = {
  login: (email, password) => POST("/api/admin/auth/login", { email, password }, { noAuth: true }),
  logout: () => POST("/api/admin/auth/logout"),
  me: () => GET("/api/admin/auth/me"),
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

export const inventoryApi = {
  list: (params = {}) => GET(`/api/admin/inventory?${new URLSearchParams(cleanParams(params))}`),
  movements: (params = {}) => GET(`/api/admin/inventory/movements?${new URLSearchParams(cleanParams(params))}`),
  recordMovement: (body) => POST("/api/admin/inventory/movements", body),
};

export const waOrdersApi = {
  list: (params = {}) => GET(`/api/admin/wa-orders?${new URLSearchParams(cleanParams(params))}`),
  updateStatus: (id, status) => PUT(`/api/admin/wa-orders/${id}`, { status }),
};

export const vendorsApi = {
  list: (params = "") => GET(`/api/admin/vendors${params}`),
  create: (body) => POST("/api/admin/vendors", body),
  update: (id, body) => PUT(`/api/admin/vendors/${id}`, body),
};

export const purchasingApi = {
  list: (params = "") => GET(`/api/admin/purchase-orders${params}`),
  get: (id) => GET(`/api/admin/purchase-orders/${id}`),
  create: (body) => POST("/api/admin/purchase-orders", body),
  update: (id, body) => PUT(`/api/admin/purchase-orders/${id}`, body),
};

export const productionApi = {
  listRuns: (params = "") => GET(`/api/admin/production-runs${params}`),
  getRun: (id) => GET(`/api/admin/production-runs/${id}`),
  createRun: (body) => POST("/api/admin/production-runs", body),
  updateRun: (id, body) => PUT(`/api/admin/production-runs/${id}`, body),
  listMachines: () => GET("/api/admin/machines"),
  listCostParameters: () => GET("/api/admin/cost-parameters"),
};

export const teamApi = {
  list: () => GET("/api/admin/team"),
  create: (body) => POST("/api/admin/team", body),
  update: (id, body) => PUT(`/api/admin/team/${id}`, body),
  remove: (id) => DEL(`/api/admin/team/${id}`),
};

export const reportsApi = {
  get: (params = "") => GET(`/api/admin/reports${params}`),
};

export const settingsApi = {
  get: () => GET("/api/admin/settings"),
  update: (body) => PUT("/api/admin/settings", body),
  listNumberSequences: () => GET("/api/admin/number-sequences"),
};

export const securityApi = {
  listRoles: () => GET("/api/admin/security/roles"),
  updateRole: (id, body) => PUT(`/api/admin/security/roles/${id}`, body),
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
