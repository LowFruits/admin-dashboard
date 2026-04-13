/* ============================================================
 * API Client — LowFruits Admin Dashboard
 * Change API_BASE to point to your Scheduling API instance.
 * ============================================================ */

const API_BASE = "https://scheduling-simulation-api.onrender.com";

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || JSON.stringify(err) || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  // --- Doctors ---
  listDoctors(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/doctors/${qs ? "?" + qs : ""}`);
  },
  getDoctor(id) {
    return apiFetch(`/doctors/${id}`);
  },
  createDoctor(data) {
    return apiFetch("/doctors/", { method: "POST", body: JSON.stringify(data) });
  },
  updateDoctor(id, data) {
    return apiFetch(`/doctors/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  deleteDoctor(id) {
    return apiFetch(`/doctors/${id}`, { method: "DELETE" });
  },

  // --- Doctor Health Funds ---
  listHealthFunds(doctorId) {
    return apiFetch(`/doctors/${doctorId}/health-funds`);
  },
  addHealthFund(doctorId, name) {
    return apiFetch(`/doctors/${doctorId}/health-funds`, {
      method: "POST",
      body: JSON.stringify({ health_fund_name: name }),
    });
  },
  removeHealthFund(doctorId, name) {
    return apiFetch(`/doctors/${doctorId}/health-funds/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  },

  // --- Appointment Types ---
  listAppointmentTypes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/appointment-types/${qs ? "?" + qs : ""}`);
  },
  createAppointmentType(data) {
    return apiFetch("/appointment-types/", { method: "POST", body: JSON.stringify(data) });
  },
  updateAppointmentType(id, data) {
    return apiFetch(`/appointment-types/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  // --- Scheduling ---
  getSlots(params) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/scheduling/slots?${qs}`);
  },
  bookAppointment(data) {
    return apiFetch("/scheduling/appointments/book", { method: "POST", body: JSON.stringify(data) });
  },
  cancelAppointment(id) {
    return apiFetch(`/scheduling/appointments/${id}/cancel`, { method: "POST" });
  },

  // --- Appointments ---
  getAppointmentsByDoctor(params) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/appointments/by-doctor?${qs}`);
  },
  getAppointmentsByPatient(params) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/appointments/by-patient?${qs}`);
  },

  // --- Patients ---
  searchPatients(q) {
    return apiFetch(`/patients/search?q=${encodeURIComponent(q)}`);
  },
  getPatientByPhone(phone) {
    return apiFetch(`/patients/by-phone?phone=${encodeURIComponent(phone)}`);
  },
  createPatient(data) {
    return apiFetch("/patients/", { method: "POST", body: JSON.stringify(data) });
  },
  getPatient(id) {
    return apiFetch(`/patients/${id}`);
  },
  getPatientRelations(id) {
    return apiFetch(`/patients/${id}/relations`);
  },

  // --- Clinics ---
  getClinic(id) {
    return apiFetch(`/clinics/${id}`);
  },
  listClinics() {
    return apiFetch("/clinics/");
  },
};
