const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// USERS API
// STARTS HERE
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // sends/receives the httpOnly cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = "Something went wrong";
    try {
      const data = await res.json();
      message = data.detail ?? message;
    } catch {}
    throw new ApiError(message, res.status);
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

  // DEDUCTIONS
  listDeductionRules: () => request("/deduction-rules/"),
  updateDeductionRule: (id: number, data: Record<string, unknown>) =>
    request(`/deduction-rules/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
};