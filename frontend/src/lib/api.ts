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
};