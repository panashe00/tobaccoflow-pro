const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// USERS API
// STARTS HERE
export class ApiError extends Error {
  status: number;
  body?: any;
  constructor(message: string, status: number, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    throw new ApiError(body?.detail ?? "Something went wrong", res.status, body);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request("/auth/login/", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/auth/logout/", { method: "POST" }),
  me: () => request("/users/me/"),

  listUsers: () => request("/users/"),
  createUser: (data: Record<string, unknown>) =>
    request("/users/", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: number, data: Record<string, unknown>) =>
    request(`/users/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (id: number) => request(`/users/${id}/`, { method: "DELETE" }),


 // ENDS HERE 
 //  NOW GROWERS
  listGrowers: (search?: string) =>
    request(`/growers/${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createGrower: (data: Record<string, unknown>) =>
    request("/growers/", { method: "POST", body: JSON.stringify(data) }),
  updateGrower: (id: number, data: Record<string, unknown>) =>
    request(`/growers/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteGrower: (id: number) => request(`/growers/${id}/`, { method: "DELETE" }),

  // TRANSPORTERS
  listTransporters: (search?: string) =>
    request(`/transporters/${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createTransporter: (data: Record<string, unknown>) =>
    request("/transporters/", { method: "POST", body: JSON.stringify(data) }),
  updateTransporter: (id: number, data: Record<string, unknown>) =>
    request(`/transporters/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTransporter: (id: number) => request(`/transporters/${id}/`, { method: "DELETE" }),

  // GRADES
  listGrades: (search?: string) =>
    request(`/grades/${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createGrade: (data: Record<string, unknown>) =>
    request("/grades/", { method: "POST", body: JSON.stringify(data) }),
  updateGrade: (id: number, data: Record<string, unknown>) =>
    request(`/grades/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteGrade: (id: number) => request(`/grades/${id}/`, { method: "DELETE" }),
  uploadGradesCsv: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/grades/upload_csv/`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) throw new ApiError("CSV upload failed", res.status);
    return res.json();
  },

  // BUYERS
  listBuyers: (search?: string) =>
    request(`/buyers/${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createBuyer: (data: Record<string, unknown>) =>
    request("/buyers/", { method: "POST", body: JSON.stringify(data) }),
  updateBuyer: (id: number, data: Record<string, unknown>) =>
    request(`/buyers/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBuyer: (id: number) => request(`/buyers/${id}/`, { method: "DELETE" }),
  setCurrentBuyer: (id: number) => request(`/buyers/${id}/set_current/`, { method: "POST" }),
  getCurrentBuyer: () => request("/buyers/current/"),

  listBuyerGrades: (buyerId: number) => request(`/buyer-grades/?buyer=${buyerId}`),
  createBuyerGrade: (buyerId: number, code: string) =>
    request("/buyer-grades/", { method: "POST", body: JSON.stringify({ buyer: buyerId, code }) }),
  updateBuyerGrade: (id: number, data: Record<string, unknown>) =>
    request(`/buyer-grades/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBuyerGrade: (id: number) => request(`/buyer-grades/${id}/`, { method: "DELETE" }),


  // DEDUCTIONS
  listDeductionRules: () => request("/deduction-rules/"),
  updateDeductionRule: (id: number, data: Record<string, unknown>) =>
    request(`/deduction-rules/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),


  //DELIVERY NOTES
  getCurrentSaleDate: () => request("/sale-dates/current/"),
  openSaleDate: (date: string, exchange_rate?: number) =>
    request("/sale-dates/open/", { method: "POST", body: JSON.stringify({ date, exchange_rate }) }),
  closeSaleDate: () => request("/sale-dates/close/", { method: "POST" }),

  lookupGrower: (number: string) => request(`/growers/lookup/?number=${encodeURIComponent(number)}`),
  searchTransporters: (query: string) => request(`/transporters/?search=${encodeURIComponent(query)}`),

  addBalesToDeliveryNote: (id: number, number_of_bales: number) =>
    request(`/delivery-notes/${id}/add_bales/`, { method: "POST", body: JSON.stringify({ number_of_bales }) }),
  listDeliveryNotes: (search?: string) =>
    request(`/delivery-notes/${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createDeliveryNote: (data: Record<string, unknown>) =>
    request("/delivery-notes/", { method: "POST", body: JSON.stringify(data) }),
  setExchangeRate: (exchange_rate: number) =>
    request("/sale-dates/set_exchange_rate/", { method: "POST", body: JSON.stringify({ exchange_rate }) }),


  //WEIGHING
  listScales: () => request("/scales/"),
  createScale: (data: Record<string, unknown>) => 
    request("/scales/", { method: "POST", body: JSON.stringify(data) }),
  updateScale: (id: number, data: Record<string, unknown>) => 
    request(`/scales/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteScale: (id: number) => request(`/scales/${id}/`, { method: "DELETE" }),
  getScaleMass: (id: number) => request(`/scales/${id}/read_mass/`),

  listHessianCodes: () => request("/hessian-codes/"),
  createHessianCode: (data: Record<string, unknown>) => 
    request("/hessian-codes/", { method: "POST", body: JSON.stringify(data) }),
  updateHessianCode: (id: number, data: Record<string, unknown>) => 
    request(`/hessian-codes/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteHessianCode: (id: number) => request(`/hessian-codes/${id}/`, { method: "DELETE" }),

  listTicketBooks: () => request("/ticket-books/"),
  getCurrentTicketBook: () => request("/ticket-books/current/"),
  createTicketBook: (data: Record<string, unknown>) => request("/ticket-books/", { method: "POST", body: JSON.stringify(data) }),
  updateTicketBook: (id: number, data: Record<string, unknown>) => request(`/ticket-books/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),

  listPendingDeliveryNotesForWeighing: (search?: string) =>
    request(`/bales/pending-delivery-notes/${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  listBalesForDeliveryNote: (dnId: number) => request(`/bales/?delivery_note=${dnId}`),
  createBale: (data: Record<string, unknown>) => request("/bales/", { method: "POST", body: JSON.stringify(data) }),
};