document.addEventListener("DOMContentLoaded", loadDoctors);

async function loadDoctors() {
  const grid = document.getElementById("doctors-grid");
  try {
    const doctors = await api.listDoctors();
    if (!doctors.length) {
      grid.innerHTML =
        '<div class="empty">אין רופאים. <a href="add-doctor.html">הוסף רופא ראשון</a></div>';
      return;
    }
    grid.innerHTML = doctors
      .map(
        (doc) => `
      <div class="card">
        <div class="card-title">${esc(doc.first_name)} ${esc(doc.last_name)}</div>
        <div class="card-meta">${esc(doc.specialty || "לא צוין")}</div>
        <div>
          <span class="badge ${doc.is_active ? "badge-success" : "badge-danger"}">
            ${doc.is_active ? "פעיל" : "לא פעיל"}
          </span>
        </div>
        <div class="card-actions">
          <a href="doctor.html?id=${doc.id}" class="btn btn-primary btn-sm">פרטים</a>
        </div>
      </div>
    `
      )
      .join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty">שגיאה בטעינת רופאים: ${esc(err.message)}</div>`;
  }
}

function esc(str) {
  if (str == null) return "";
  const d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}
