// frontend/src/services/api.ts
const API_BASE_URL = "http://localhost:5000/api";

// --- Auth API ---
// This function is now updated to not require username and password.
export const login = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // No body is sent for the auto-login
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Login failed");
  }
  return response.json();
};

// Helper function for authenticated API requests
async function request(
  endpoint: string,
  options: RequestInit = {},
  returnsBlob = false
) {
  // Use sessionStorage to get user data for the current session.
  const userStr = sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  } as Record<string, string>;
  if (user && user.token) {
    headers["Authorization"] = `Bearer ${user.token}`;
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("auth-error"));
    const errorData = await response.json();
    throw new Error(errorData.message || "Something went wrong");
  }
  if (returnsBlob) return response.blob();
  if (response.status === 204) return; // For DELETE requests with no content
  return response.json();
}

export const refreshToken = async () => {
  return request("/auth/refresh", { method: "POST" });
};

// --- Settings API ---
export const getSettings = () => request("/settings");
export const updateSettings = (settings: any) =>
  request("/settings", { method: "PUT", body: JSON.stringify(settings) });

// --- Facturation API ---
export const getFactures = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return request(`/facturation?${params.toString()}`);
};
export const createFacture = (facture: any) =>
  request("/facturation", { method: "POST", body: JSON.stringify(facture) });
export const updateFacture = (id: number, facture: any) =>
  request(`/facturation/${id}`, {
    method: "PUT",
    body: JSON.stringify(facture),
  });
export const deleteFacture = (id: number) =>
  request(`/facturation/${id}`, { method: "DELETE" });

// --- Daily Service API ---
export const getDailyServices = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return request(`/daily-services?${params.toString()}`);
};
export const createDailyService = (service: any) =>
  request("/daily-services", { method: "POST", body: JSON.stringify(service) });
export const updateDailyService = (id: number, service: any) =>
  request(`/daily-services/${id}`, {
    method: "PUT",
    body: JSON.stringify(service),
  });
export const deleteDailyService = (id: number) =>
  request(`/daily-services/${id}`, { method: "DELETE" });
export const getDailyServiceReport = (startDate?: string, endDate?: string) => {
  let endpoint = "/daily-services/report";
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const queryString = params.toString();
  if (queryString) {
    endpoint += `?${queryString}`;
  }
  return request(endpoint);
};

// --- Dashboard API ---
export const getDashboardStats = (startDate?: string, endDate?: string) => {
  let endpoint = "/dashboard/stats";
  if (startDate && endDate) {
    const params = new URLSearchParams({ startDate, endDate });
    endpoint += `?${params.toString()}`;
  }
  return request(endpoint);
};

export const getProfitReport = (filterType?: string) => {
  let endpoint = "/dashboard/profit-report";
  if (filterType && filterType !== "all") {
    const params = new URLSearchParams({ programType: filterType });
    endpoint += `?${params.toString()}`;
  }
  return request(endpoint);
};

// --- Program API ---
export const getPrograms = (
  page = 1,
  limit = 6,
  searchTerm = "",
  filterType = "all"
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    searchTerm,
    filterType,
  });
  return request(`/programs?${params.toString()}`);
};

export const searchProgramsForBooking = (searchTerm = "", limit = 10) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    searchTerm,
    filterType: "all",
  });
  return request(`/programs?${params.toString()}`);
};

export const getProgramById = (id: string) => request(`/programs/${id}`);
export const createProgram = (program: any) =>
  request("/programs", { method: "POST", body: JSON.stringify(program) });
export const updateProgram = (id: number, program: any) =>
  request(`/programs/${id}`, { method: "PUT", body: JSON.stringify(program) });
export const deleteProgram = (id: number) =>
  request(`/programs/${id}`, { method: "DELETE" });

// --- Program Pricing API ---
export const getProgramPricing = (page = 1, limit = 10) =>
  request(`/program-pricing?page=${page}&limit=${limit}`);
export const getProgramPricingByProgramId = (programId: string) =>
  request(`/program-pricing/program/${programId}`);
export const createProgramPricing = (pricing: any) =>
  request("/program-pricing", {
    method: "POST",
    body: JSON.stringify(pricing),
  });
export const updateProgramPricing = (id: number, pricing: any) =>
  request(`/program-pricing/${id}`, {
    method: "PUT",
    body: JSON.stringify(pricing),
  });
export const deleteProgramPricing = (id: number) =>
  request(`/program-pricing/${id}`, { method: "DELETE" });

// --- Booking API ---
export const getBookingsByProgram = (
  programId: string,
  params: {
    page: number;
    limit: number;
    searchTerm: string;
    sortOrder: string;
    statusFilter: string;
    employeeFilter: string;
  }
) => {
  const queryParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    searchTerm: params.searchTerm,
    sortOrder: params.sortOrder,
    statusFilter: params.statusFilter,
    employeeFilter: params.employeeFilter,
  }).toString();
  return request(`/bookings/program/${programId}?${queryParams}`);
};

export const searchBookingsInProgram = async (
  programId: string,
  searchTerm: string
) => {
  if (!searchTerm) return [];
  const params = new URLSearchParams({
    page: "1",
    limit: "20",
    searchTerm,
    sortOrder: "newest",
    statusFilter: "all",
    employeeFilter: "all",
  });
  const result = await request(
    `/bookings/program/${programId}?${params.toString()}`
  );
  return result.data;
};

export const createBooking = (booking: any) =>
  request("/bookings", { method: "POST", body: JSON.stringify(booking) });
export const updateBooking = (id: number, booking: any) =>
  request(`/bookings/${id}`, { method: "PUT", body: JSON.stringify(booking) });
export const deleteBooking = (id: number) =>
  request(`/bookings/${id}`, { method: "DELETE" });

// --- Payment API ---
export const addPayment = (bookingId: number, payment: any) =>
  request(`/bookings/${bookingId}/payments`, {
    method: "POST",
    body: JSON.stringify(payment),
  });
export const updatePayment = (
  bookingId: number,
  paymentId: string,
  payment: any
) =>
  request(`/bookings/${bookingId}/payments/${paymentId}`, {
    method: "PUT",
    body: JSON.stringify(payment),
  });
export const deletePayment = (bookingId: number, paymentId: string) =>
  request(`/bookings/${bookingId}/payments/${paymentId}`, { method: "DELETE" });

// --- Export/Import API ---
export const exportBookingsToExcel = (programId: string) =>
  request(`/bookings/export-excel/program/${programId}`, {}, true);

export const exportBookingTemplateForProgram = (programId: string) =>
  request(`/bookings/export-template/program/${programId}`, {}, true);

export const importBookings = (file: File, programId: string) => {
  const formData = new FormData();
  formData.append("file", file);
  const userStr = sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const headers: Record<string, string> = {};
  if (user && user.token) {
    headers["Authorization"] = `Bearer ${user.token}`;
  }
  return fetch(`${API_BASE_URL}/bookings/import-excel/program/${programId}`, {
    method: "POST",
    body: formData,
    headers,
  }).then(async (res) => {
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Import failed");
    }
    return res.json();
  });
};

// --- Room Management API ---
export const getRooms = (programId: string, hotelName: string) =>
  request(`/room-management/program/${programId}/hotel/${hotelName}`);

export const saveRooms = (programId: string, hotelName: string, rooms: any) =>
  request(`/room-management/program/${programId}/hotel/${hotelName}`, {
    method: "POST",
    body: JSON.stringify({ rooms }),
  });

export const searchUnassignedOccupants = (
  programId: string,
  hotelName: string,
  searchTerm: string
) => {
  const params = new URLSearchParams({ searchTerm });
  return request(
    `/room-management/program/${programId}/hotel/${hotelName}/search-unassigned?${params.toString()}`
  );
};

export const exportRoomAssignmentsToExcel = (programId: string) =>
  request(`/room-management/program/${programId}/export-excel`, {}, true);
