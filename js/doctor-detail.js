/* ============================================================
 * Doctor Detail Page
 * ============================================================ */

const HEALTH_FUNDS = ["כללית", "מכבי", "מאוחדת", "לאומית"];
const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

let doctorId;
let doctorData;
let currentWeekStart;

document.addEventListener("DOMContentLoaded", init);

function init() {
  const params = new URLSearchParams(window.location.search);
  doctorId = params.get("id");
  if (!doctorId) {
    document.querySelector(".main").innerHTML =
      '<div class="empty">לא צוין מזהה רופא. <a href="index.html">חזור לרשימה</a></div>';
    return;
  }

  currentWeekStart = getWeekStart(new Date());

  document.getElementById("cal-prev").addEventListener("click", () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    loadCalendar();
  });
  document.getElementById("cal-next").addEventListener("click", () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    loadCalendar();
  });

  document.getElementById("add-appt-type-btn").addEventListener("click", showAddApptTypeModal);

  // Load all sections — info must resolve first (sets doctorData), then the rest
  loadDoctorInfo().then(() => {
    loadHealthFunds();
    loadAppointmentTypes();
    loadCalendar();
  });
}

/* ---- Doctor Info ---- */

async function loadDoctorInfo() {
  const body = document.querySelector("#info-section .section-body");
  try {
    doctorData = await api.getDoctor(doctorId);
    document.getElementById("doctor-name").textContent =
      `${doctorData.first_name} ${doctorData.last_name}`;
    document.title = `LowFruits Admin — ${doctorData.first_name} ${doctorData.last_name}`;

    document.getElementById("save-info-btn").style.display = "";
    document.getElementById("save-info-btn").addEventListener("click", saveDoctorInfo);

    body.innerHTML = `
      <div class="form-grid">
        <div class="form-group">
          <label>שם פרטי</label>
          <input type="text" id="f-first_name" value="${attr(doctorData.first_name)}">
        </div>
        <div class="form-group">
          <label>שם משפחה</label>
          <input type="text" id="f-last_name" value="${attr(doctorData.last_name)}">
        </div>
        <div class="form-group">
          <label>התמחות</label>
          <input type="text" id="f-specialty" value="${attr(doctorData.specialty)}">
        </div>
        <div class="form-group">
          <label>אימייל</label>
          <input type="email" id="f-email" value="${attr(doctorData.email)}">
        </div>
        <div class="form-group">
          <label>טלפון</label>
          <input type="tel" id="f-phone" value="${attr(doctorData.phone)}">
        </div>
        <div class="form-group">
          <label>פעיל</label>
          <label class="toggle">
            <input type="checkbox" id="f-is_active" ${doctorData.is_active ? "checked" : ""}>
            <span class="slider"></span>
          </label>
        </div>
      </div>`;
  } catch (err) {
    body.innerHTML = `<div class="empty">שגיאה: ${esc(err.message)}</div>`;
  }
}

async function saveDoctorInfo() {
  const btn = document.getElementById("save-info-btn");
  btn.disabled = true;
  btn.textContent = "שומר...";
  try {
    const data = {
      first_name: document.getElementById("f-first_name").value,
      last_name: document.getElementById("f-last_name").value,
      specialty: document.getElementById("f-specialty").value,
      email: document.getElementById("f-email").value,
      phone: document.getElementById("f-phone").value,
      is_active: document.getElementById("f-is_active").checked,
    };
    doctorData = await api.updateDoctor(doctorId, data);
    document.getElementById("doctor-name").textContent =
      `${doctorData.first_name} ${doctorData.last_name}`;
    toast("הפרטים נשמרו בהצלחה", "success");
  } catch (err) {
    toast(`שגיאה בשמירה: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "שמור";
  }
}

/* ---- Health Funds ---- */

async function loadHealthFunds() {
  const body = document.querySelector("#health-funds-section .section-body");
  try {
    const funds = await api.listHealthFunds(doctorId);
    const active = funds.map((f) => f.health_fund_name);
    const available = HEALTH_FUNDS.filter((f) => !active.includes(f));

    body.innerHTML = `
      <div class="tag-list">
        ${active.map((name) => `<span class="tag">${esc(name)}<span class="remove" data-fund="${attr(name)}">&times;</span></span>`).join("")}
        ${!active.length ? '<span style="color:var(--text-secondary)">לא נבחרו קופות חולים</span>' : ""}
      </div>
      ${available.length ? `<div style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap">
        ${available.map((f) => `<button class="btn btn-secondary btn-sm add-fund" data-fund="${attr(f)}">+ ${esc(f)}</button>`).join("")}
      </div>` : ""}`;

    body.querySelectorAll(".remove").forEach((el) =>
      el.addEventListener("click", async () => {
        await api.removeHealthFund(doctorId, el.dataset.fund);
        toast(`${el.dataset.fund} הוסרה`, "success");
        loadHealthFunds();
      })
    );
    body.querySelectorAll(".add-fund").forEach((el) =>
      el.addEventListener("click", async () => {
        await api.addHealthFund(doctorId, el.dataset.fund);
        toast(`${el.dataset.fund} נוספה`, "success");
        loadHealthFunds();
      })
    );
  } catch (err) {
    body.innerHTML = `<div class="empty">שגיאה: ${esc(err.message)}</div>`;
  }
}

/* ---- Appointment Types ---- */

async function loadAppointmentTypes() {
  const body = document.querySelector("#appt-types-section .section-body");
  try {
    const all = await api.listAppointmentTypes();
    const types = doctorData?.clinic_id
      ? all.filter((t) => t.clinic_id === doctorData.clinic_id)
      : all;

    if (!types.length) {
      body.innerHTML = '<div class="empty">אין סוגי תורים</div>';
      return;
    }

    body.innerHTML = `
      <div class="table-container"><table>
        <thead><tr>
          <th>שם</th><th>משך (דקות)</th><th>מחיר פרטי</th><th>מחיר קופ"ח</th><th>סטטוס</th>
        </tr></thead>
        <tbody>${types.map((t) => `<tr>
          <td>${esc(t.name)}</td>
          <td>${t.duration_minutes}</td>
          <td>${t.price_private != null ? "₪" + t.price_private : "—"}</td>
          <td>${t.price_health_fund != null ? "₪" + t.price_health_fund : "—"}</td>
          <td><span class="badge ${t.is_active ? "badge-success" : "badge-danger"}">${t.is_active ? "פעיל" : "לא פעיל"}</span></td>
        </tr>`).join("")}</tbody>
      </table></div>`;
  } catch (err) {
    body.innerHTML = `<div class="empty">שגיאה: ${esc(err.message)}</div>`;
  }
}

function showAddApptTypeModal() {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal">
        <h3>הוסף סוג תור</h3>
        <div class="form-grid">
          <div class="form-group"><label>שם</label><input id="m-name" placeholder="ביקור ראשון"></div>
          <div class="form-group"><label>משך (דקות)</label><input type="number" id="m-dur" value="30"></div>
          <div class="form-group"><label>מחיר פרטי</label><input type="number" id="m-pp" placeholder="0"></div>
          <div class="form-group"><label>מחיר קופ"ח</label><input type="number" id="m-phf" placeholder="0"></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="m-save">שמור</button>
          <button class="btn btn-secondary" id="m-cancel">ביטול</button>
        </div>
      </div>
    </div>`;

  const close = () => (root.innerHTML = "");
  document.getElementById("m-cancel").addEventListener("click", close);
  document.getElementById("modal-bg").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) close();
  });

  document.getElementById("m-save").addEventListener("click", async () => {
    try {
      await api.createAppointmentType({
        clinic_id: doctorData.clinic_id,
        name: document.getElementById("m-name").value,
        duration_minutes: parseInt(document.getElementById("m-dur").value),
        price_private: parseFloat(document.getElementById("m-pp").value) || 0,
        price_health_fund: parseFloat(document.getElementById("m-phf").value) || 0,
      });
      close();
      toast("סוג תור נוסף", "success");
      loadAppointmentTypes();
    } catch (err) {
      toast(`שגיאה: ${err.message}`, "error");
    }
  });
}

/* ---- Calendar ---- */

async function loadCalendar() {
  const body = document.getElementById("calendar-body");
  const label = document.getElementById("cal-week-label");

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  label.textContent = `${fmtDate(currentWeekStart)} — ${fmtDate(weekEnd)}`;
  body.innerHTML = '<div class="loading">טוען יומן...</div>';

  try {
    // Fetch appointments for each day of the week
    const appointments = [];
    const fetches = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split("T")[0];
      fetches.push(
        api
          .getAppointmentsByDoctor({ doctor_id: doctorId, date: dateStr })
          .then((res) => {
            if (Array.isArray(res)) appointments.push(...res);
          })
          .catch(() => {}) // no appointments for that day
      );
    }
    await Promise.all(fetches);

    // Build the weekly grid: hours 08:00–18:00
    const hours = [];
    for (let h = 8; h <= 18; h++) hours.push(h);

    const dayHeaders = DAY_NAMES.map((name, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return `<div class="day-header">${name}<br><small>${d.getDate()}/${d.getMonth() + 1}</small></div>`;
    }).join("");

    const rows = hours
      .map((h) => {
        const timeLabel = `<div class="time-label">${String(h).padStart(2, "0")}:00</div>`;
        const cells = DAY_NAMES.map((_, dayIdx) => {
          const d = new Date(currentWeekStart);
          d.setDate(d.getDate() + dayIdx);
          const dateStr = d.toISOString().split("T")[0];

          const appt = appointments.find((a) => {
            const s = new Date(a.start_time);
            return s.toISOString().split("T")[0] === dateStr && s.getHours() === h;
          });

          if (appt) {
            const s = new Date(appt.start_time);
            const time = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
            return `<div class="slot has-appointment"><div class="appointment-block" title="${attr(appt.status || "")}">${time}</div></div>`;
          }
          return '<div class="slot"></div>';
        }).join("");
        return timeLabel + cells;
      })
      .join("");

    body.innerHTML = `<div class="week-view"><div class="time-label"></div>${dayHeaders}${rows}</div>`;
  } catch (err) {
    body.innerHTML = `<div class="empty">שגיאה בטעינת יומן: ${esc(err.message)}</div>`;
  }
}

/* ---- Utilities ---- */

function esc(str) {
  if (str == null) return "";
  const d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}

function attr(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDate(d) {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function toast(message, type) {
  const c = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
