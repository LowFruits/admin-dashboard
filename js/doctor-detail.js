/* ============================================================
 * Doctor Detail Page
 * ============================================================ */

const HEALTH_FUNDS = ["כללית", "מכבי", "מאוחדת", "לאומית"];
const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const DOW_API = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

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

  document.getElementById("add-appt-type-btn").addEventListener("click", () => showApptTypeModal());

  document.getElementById("msg-status-filter").addEventListener("change", (e) => {
    messagesPage.status = e.target.value;
    messagesPage.offset = 0;
    loadMessages();
  });

  // Load all sections — info must resolve first (sets doctorData), then the rest
  loadDoctorInfo().then(() => {
    loadHealthFunds();
    loadAppointmentTypes();
    loadAvailability();
    loadCalendar();
    loadMessages();
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
      ...doctorData,
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
    const types = await api.listAppointmentTypes(doctorId);

    if (!types.length) {
      body.innerHTML = '<div class="empty">אין סוגי תורים</div>';
      return;
    }

    body.innerHTML = `
      <div class="table-container"><table>
        <thead><tr>
          <th>שם</th><th>משך (דקות)</th><th>מחיר פרטי</th><th>מחיר קופ"ח</th><th>סטטוס</th><th></th>
        </tr></thead>
        <tbody>${types.map((t) => `<tr>
          <td>${esc(t.name)}</td>
          <td>${t.duration_minutes}</td>
          <td>${t.price_private != null ? "₪" + t.price_private : "—"}</td>
          <td>${t.price_health_fund != null ? "₪" + t.price_health_fund : "—"}</td>
          <td><span class="badge ${t.is_active ? "badge-success" : "badge-danger"}">${t.is_active ? "פעיל" : "לא פעיל"}</span></td>
          <td><button class="btn btn-secondary btn-sm edit-type" data-id="${attr(t.id)}">ערוך</button></td>
        </tr>`).join("")}</tbody>
      </table></div>`;

    body.querySelectorAll(".edit-type").forEach((btn) => {
      btn.addEventListener("click", () => {
        const existing = types.find((t) => t.id === btn.dataset.id);
        if (existing) showApptTypeModal(existing);
      });
    });
  } catch (err) {
    body.innerHTML = `<div class="empty">שגיאה: ${esc(err.message)}</div>`;
  }
}

function showApptTypeModal(existing = null) {
  const isEdit = !!existing;
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal">
        <h3>${isEdit ? "ערוך סוג תור" : "הוסף סוג תור"}</h3>
        <div class="form-grid">
          <div class="form-group"><label>שם</label><input id="m-name" placeholder="ביקור ראשון" required value="${attr(existing?.name)}"></div>
          <div class="form-group"><label>משך (דקות)</label><input type="number" id="m-dur" value="${attr(existing?.duration_minutes ?? 30)}" min="1" required></div>
          <div class="form-group"><label>מחיר פרטי</label><input type="number" id="m-pp" placeholder="0" min="0" value="${attr(existing?.price_private ?? "")}"></div>
          <div class="form-group"><label>מחיר קופ"ח</label><input type="number" id="m-phf" placeholder="0" min="0" value="${attr(existing?.price_health_fund ?? "")}"></div>
          ${isEdit ? `
          <div class="form-group">
            <label>פעיל</label>
            <label class="toggle">
              <input type="checkbox" id="m-active" ${existing.is_active ? "checked" : ""}>
              <span class="slider"></span>
            </label>
          </div>` : ""}
        </div>
        <div class="form-error" id="m-error" style="display:none"></div>
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

  const errorEl = document.getElementById("m-error");
  const showError = (msg) => {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "" : "none";
  };

  document.getElementById("m-save").addEventListener("click", async () => {
    const name = document.getElementById("m-name").value.trim();
    const duration = parseInt(document.getElementById("m-dur").value, 10);

    if (!name) return showError("שם הוא שדה חובה");
    if (!Number.isFinite(duration) || duration <= 0) return showError("משך חייב להיות מספר חיובי");
    showError("");

    const btn = document.getElementById("m-save");
    btn.disabled = true;
    btn.textContent = "שומר...";
    try {
      const fields = {
        name,
        duration_minutes: duration,
        price_private: parseFloat(document.getElementById("m-pp").value) || 0,
        price_health_fund: parseFloat(document.getElementById("m-phf").value) || 0,
      };
      if (isEdit) {
        const payload = {
          ...existing,
          ...fields,
          is_active: document.getElementById("m-active").checked,
        };
        await api.updateAppointmentType(existing.id, payload);
        toast("סוג תור עודכן", "success");
      } else {
        await api.createAppointmentType({ doctor_id: doctorId, ...fields });
        toast("סוג תור נוסף", "success");
      }
      close();
      loadAppointmentTypes();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "שמור";
      showError(err.message);
    }
  });
}

/* ---- Availability ---- */

let availabilityCache = null;

async function loadAvailability() {
  const body = document.querySelector("#availability-section .section-body");
  body.innerHTML = '<div class="loading">טוען...</div>';
  try {
    availabilityCache = await api.getAvailability(doctorId);
    renderAvailability();
  } catch (err) {
    body.innerHTML = `<div class="empty">שגיאה בטעינת זמינות: ${esc(err.message)}</div>`;
  }
}

function renderAvailability() {
  const body = document.querySelector("#availability-section .section-body");
  const rules = (availabilityCache?.rules || []).filter((r) => r.is_active !== false);
  const exceptions = availabilityCache?.exceptions || [];

  const allEmpty = rules.length === 0;

  // Group rules by day index (0=Sunday..6=Saturday)
  const rulesByDay = Array.from({ length: 7 }, () => []);
  for (const r of rules) {
    const idx = DOW_API.indexOf(r.day_of_week);
    if (idx >= 0) rulesByDay[idx].push(r);
  }
  rulesByDay.forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));

  body.innerHTML = `
    <div class="avail-panel">
      <div class="avail-panel-header">
        <h3>שעות שבועיות</h3>
        ${allEmpty ? '<button class="btn btn-secondary btn-sm" id="seed-defaults-btn">טען ברירת מחדל (א\'-ה\' 09:00–17:00)</button>' : ""}
      </div>
      <div class="avail-days">
        ${DAY_NAMES.map((name, i) => `
          <div class="avail-day" data-day-idx="${i}">
            <div class="avail-day-name">${esc(name)}</div>
            <div class="avail-day-rules" id="avail-day-${i}">
              ${rulesByDay[i].length
                ? rulesByDay[i].map((r) => `
                    <span class="avail-chip">
                      <span class="avail-chip-times">${esc(toTimeInput(r.start_time))}–${esc(toTimeInput(r.end_time))}</span>
                      <span class="avail-chip-dur">· ${r.slot_duration_minutes || 30} דק׳</span>
                      <span class="remove" data-rule-id="${attr(r.id)}">&times;</span>
                    </span>`).join("")
                : '<span class="avail-closed">סגור</span>'
              }
              <button class="btn btn-secondary btn-sm avail-add-window" data-day-idx="${i}">+ הוסף חלון</button>
            </div>
          </div>`).join("")}
      </div>
    </div>

    <div class="avail-panel">
      <div class="avail-panel-header">
        <h3>חריגים</h3>
        <button class="btn btn-primary btn-sm" id="add-exception-btn">+ הוסף חריג</button>
      </div>
      <div class="avail-exceptions">
        ${exceptions.length === 0
          ? '<div class="empty" style="padding:1rem">אין חריגים</div>'
          : exceptions
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => `
                <div class="avail-exception" data-exc-id="${attr(e.id)}">
                  <span class="avail-exc-date">${esc(e.date)}</span>
                  <span class="badge ${e.exception_type === "blocked" ? "badge-danger" : "badge-success"}">
                    ${e.exception_type === "blocked" ? "חסום" : "פתוח חריג"}
                  </span>
                  <span class="avail-exc-times">${
                    e.start_time && e.end_time
                      ? esc(toTimeInput(e.start_time) + "–" + toTimeInput(e.end_time))
                      : "כל היום"
                  }</span>
                  <span class="avail-exc-reason">${esc(e.reason || "—")}</span>
                  <span class="remove" data-exc-id="${attr(e.id)}">&times;</span>
                </div>`).join("")
        }
      </div>
    </div>`;

  // Wire up handlers
  const seedBtn = document.getElementById("seed-defaults-btn");
  if (seedBtn) seedBtn.addEventListener("click", handleSeedDefaults);

  body.querySelectorAll(".avail-add-window").forEach((btn) =>
    btn.addEventListener("click", () => showAddRuleModal(parseInt(btn.dataset.dayIdx, 10)))
  );

  body.querySelectorAll(".avail-chip .remove").forEach((el) =>
    el.addEventListener("click", () => handleDeleteRule(el.dataset.ruleId))
  );

  document.getElementById("add-exception-btn").addEventListener("click", () => showExceptionModal());

  body.querySelectorAll(".avail-exception .remove").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      handleDeleteException(el.dataset.excId);
    })
  );

  body.querySelectorAll(".avail-exception").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".remove")) return;
      const excId = row.dataset.excId;
      const exc = (availabilityCache?.exceptions || []).find((x) => x.id === excId);
      if (exc) showExceptionModal(exc);
    });
  });
}

function showAddRuleModal(dayIdx) {
  const root = document.getElementById("modal-root");
  const dayName = DAY_NAMES[dayIdx];
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal">
        <h3>הוסף חלון — יום ${esc(dayName)}</h3>
        <div class="form-grid">
          <div class="form-group"><label>שעת התחלה</label><input type="time" id="rf-start" value="09:00" required></div>
          <div class="form-group"><label>שעת סיום</label><input type="time" id="rf-end" value="17:00" required></div>
          <div class="form-group"><label>משך תור (דקות)</label><input type="number" id="rf-dur" value="30" min="1" required></div>
        </div>
        <div class="form-error" id="rf-error" style="display:none"></div>
        <div class="form-actions">
          <button class="btn btn-primary" id="rf-save">שמור</button>
          <button class="btn btn-secondary" id="rf-cancel">ביטול</button>
        </div>
      </div>
    </div>`;

  const close = () => (root.innerHTML = "");
  document.getElementById("rf-cancel").addEventListener("click", close);
  document.getElementById("modal-bg").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) close();
  });

  const errorEl = document.getElementById("rf-error");
  const showError = (msg) => {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "" : "none";
  };

  attachShowPicker(document.getElementById("modal-bg"));

  document.getElementById("rf-save").addEventListener("click", async () => {
    const start = document.getElementById("rf-start").value;
    const end = document.getElementById("rf-end").value;
    const dur = parseInt(document.getElementById("rf-dur").value, 10);

    if (!start || !end) return showError("יש למלא שעת התחלה ושעת סיום");
    if (end <= start) return showError("שעת סיום חייבת להיות אחרי שעת התחלה");
    if (!Number.isFinite(dur) || dur <= 0) return showError("משך תור חייב להיות מספר חיובי");
    showError("");

    const btn = document.getElementById("rf-save");
    btn.disabled = true;
    btn.textContent = "שומר...";
    try {
      await api.createAvailabilityRule({
        doctor_id: doctorId,
        day_of_week: DOW_API[dayIdx],
        start_time: fromTimeInput(start),
        end_time: fromTimeInput(end),
        slot_duration_minutes: dur,
      });
      close();
      toast("חלון נוסף", "success");
      await loadAvailability();
      loadCalendar();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "שמור";
      showError(err.message);
    }
  });
}

async function handleSeedDefaults() {
  try {
    await api.seedDefaultRules(doctorId);
    toast("ברירת מחדל נטענה", "success");
    await loadAvailability();
    loadCalendar();
  } catch (err) {
    toast(`שגיאה: ${err.message}`, "error");
  }
}

async function handleDeleteRule(ruleId) {
  try {
    await api.deleteAvailabilityRule(ruleId);
    toast("חלון הוסר", "success");
    await loadAvailability();
    loadCalendar();
  } catch (err) {
    toast(`שגיאה: ${err.message}`, "error");
  }
}

async function handleDeleteException(excId) {
  try {
    await api.deleteCalendarException(excId);
    toast("חריג הוסר", "success");
    await loadAvailability();
    loadCalendar();
  } catch (err) {
    toast(`שגיאה: ${err.message}`, "error");
  }
}

function showExceptionModal(existing = null) {
  const isEdit = !!existing;
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-bg">
      <div class="modal">
        <h3>${isEdit ? "ערוך חריג ביומן" : "הוסף חריג ביומן"}</h3>
        <div class="form-grid">
          <div class="form-group"><label>תאריך</label><input type="date" id="ex-date" required value="${attr(existing?.date ?? "")}"></div>
          <div class="form-group">
            <label>סוג</label>
            <select id="ex-type">
              <option value="blocked" ${existing?.exception_type === "blocked" ? "selected" : ""}>חסום</option>
              <option value="override" ${existing?.exception_type === "override" ? "selected" : ""}>פתוח חריג</option>
            </select>
          </div>
          <div class="form-group"><label>שעת התחלה (אופציונלי)</label><input type="time" id="ex-start" value="${attr(toTimeInput(existing?.start_time || ""))}"></div>
          <div class="form-group"><label>שעת סיום (אופציונלי)</label><input type="time" id="ex-end" value="${attr(toTimeInput(existing?.end_time || ""))}"></div>
          <div class="form-group" style="grid-column:1/-1">
            <label>סיבה</label><input id="ex-reason" placeholder="חופשה / כנס / וכו'" value="${attr(existing?.reason ?? "")}">
          </div>
        </div>
        <div class="form-error" id="ex-error" style="display:none"></div>
        <div class="form-actions">
          <button class="btn btn-primary" id="ex-save">שמור</button>
          <button class="btn btn-secondary" id="ex-cancel">ביטול</button>
        </div>
      </div>
    </div>`;

  const close = () => (root.innerHTML = "");
  document.getElementById("ex-cancel").addEventListener("click", close);
  document.getElementById("modal-bg").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) close();
  });

  const errorEl = document.getElementById("ex-error");
  const showError = (msg) => {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "" : "none";
  };

  attachShowPicker(document.getElementById("modal-bg"));

  document.getElementById("ex-save").addEventListener("click", async () => {
    const date = document.getElementById("ex-date").value;
    const type = document.getElementById("ex-type").value;
    const start = document.getElementById("ex-start").value;
    const end = document.getElementById("ex-end").value;
    const reason = document.getElementById("ex-reason").value.trim();

    if (!date) return showError("תאריך הוא שדה חובה");
    const hasStart = !!start;
    const hasEnd = !!end;
    if (hasStart !== hasEnd) return showError("יש למלא גם שעת התחלה וגם סיום, או להשאיר את שניהם ריקים");
    if (hasStart && hasEnd && end <= start) return showError("שעת סיום חייבת להיות אחרי שעת התחלה");
    showError("");

    const btn = document.getElementById("ex-save");
    btn.disabled = true;
    btn.textContent = "שומר...";
    const payload = {
      doctor_id: doctorId,
      date,
      exception_type: type,
      start_time: hasStart ? fromTimeInput(start) : null,
      end_time: hasEnd ? fromTimeInput(end) : null,
      reason: reason || null,
    };
    try {
      // POST first so we never lose the original on a failed update.
      await api.createCalendarException(payload);
      if (isEdit) {
        try {
          await api.deleteCalendarException(existing.id);
        } catch (delErr) {
          toast("החריג עודכן אך לא ניתן היה למחוק את הגרסה הקודמת — רענן ומחק ידנית", "error");
        }
      }
      close();
      toast(isEdit ? "חריג עודכן" : "חריג נוסף", "success");
      await loadAvailability();
      loadCalendar();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "שמור";
      showError(err.message);
    }
  });
}

function toTimeInput(s) {
  if (!s) return "";
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function fromTimeInput(s) {
  if (!s) return s;
  return s.length === 5 ? s + ":00" : s;
}

/* ---- Calendar ---- */

async function loadCalendar() {
  const body = document.getElementById("calendar-body");
  const label = document.getElementById("cal-week-label");

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  label.textContent = `${fmtDate(currentWeekStart)} — ${fmtDate(weekEnd)}`;
  body.innerHTML = '<div class="loading">טוען יומן...</div>';

  const [apptsRes, availRes, typesRes] = await Promise.allSettled([
    api.getAppointmentsByDoctor({ doctor_id: doctorId }),
    api.getAvailability(doctorId),
    api.listAppointmentTypes(doctorId),
  ]);

  if (apptsRes.status === "rejected") {
    body.innerHTML = `<div class="empty">שגיאה בטעינת יומן: ${esc(apptsRes.reason.message)}</div>`;
    return;
  }
  const appointments = (Array.isArray(apptsRes.value) ? apptsRes.value : [])
    .filter((a) => a.status !== "cancelled");

  const availability = availRes.status === "fulfilled" ? availRes.value : null;
  const rules = (availability?.rules || []).filter((r) => r.is_active !== false);
  const exceptions = availability?.exceptions || [];
  const overlayAvailable = availability !== null;

  // Group exceptions by date for fast lookup.
  const exceptionsByDate = {};
  for (const e of exceptions) {
    (exceptionsByDate[e.date] = exceptionsByDate[e.date] || []).push(e);
  }

  // Per-day cell duration: min slot_duration of that weekday's active rules; default 60 min.
  const dayDurations = DAY_NAMES.map((_, i) => {
    const dowKey = DOW_API[i];
    const dayRules = rules.filter((r) => r.day_of_week === dowKey);
    if (!dayRules.length) return 60;
    return Math.min(...dayRules.map((r) => r.slot_duration_minutes || 30));
  });

  // Shared grid pitch = GCD of per-day durations → integer span per cell.
  const pitch = gcdOfArray(dayDurations);

  const dayStartMin = 8 * 60;
  const dayEndMin = 18 * 60;
  const totalRows = (dayEndMin - dayStartMin) / pitch;

  // Render-scoped data — fresh per render, no cross-render cache.
  const weekStartStr = localDateStr(currentWeekStart);
  const weekEndStr = localDateStr(weekEnd);
  const visibleAppointments = appointments.filter((a) => {
    const ds = localDateStr(new Date(a.start_time));
    return ds >= weekStartStr && ds <= weekEndStr;
  });
  const typesMap = new Map(
    (typesRes.status === "fulfilled" ? typesRes.value : []).map((t) => [t.id, t])
  );
  const patientIds = [...new Set(visibleAppointments.map((a) => a.patient_id).filter(Boolean))];
  const patientResults = await Promise.allSettled(
    patientIds.map((id) => api.getPatient(id).then((p) => [id, p]))
  );
  const patientsMap = new Map();
  for (const r of patientResults) {
    if (r.status === "fulfilled") patientsMap.set(r.value[0], r.value[1]);
  }

  // Bucket appointments by (date, slotStartMin) using each day's own duration.
  const buckets = {};
  for (const a of appointments) {
    const start = new Date(a.start_time);
    const dateStr = localDateStr(start);
    if (dateStr < weekStartStr || dateStr > weekEndStr) continue;
    const dayDur = dayDurations[start.getDay()];
    const apptMin = start.getHours() * 60 + start.getMinutes();
    if (apptMin < dayStartMin || apptMin >= dayEndMin) continue;
    const slotStartMin = dayStartMin + Math.floor((apptMin - dayStartMin) / dayDur) * dayDur;
    const key = `${dateStr} ${slotStartMin}`;
    (buckets[key] = buckets[key] || []).push({ appt: a, start });
  }

  // Day headers — row 1, columns 2..8.
  const dayHeaders = DAY_NAMES.map((name, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    const dateStr = localDateStr(d);
    const dayExc = exceptionsByDate[dateStr] || [];
    const hasExc = dayExc.length > 0;
    const hasBlocked = dayExc.some((e) => e.exception_type === "blocked");
    const headerClass = hasBlocked ? "has-blocked" : hasExc ? "has-exception" : "";
    const reasonText = hasExc
      ? dayExc.find((e) => e.reason)?.reason || (hasBlocked ? "חסום" : "פתוח חריג")
      : "";
    return `<div class="day-header ${headerClass}" style="grid-column: ${i + 2}; grid-row: 1">
      ${esc(name)}<br><small>${d.getDate()}/${d.getMonth() + 1}</small>
      ${hasExc ? `<small class="exception-reason">${esc(reasonText)}</small>` : ""}
    </div>`;
  }).join("");

  // Time labels — column 1, one per hour, spanning 60/pitch rows so each label
  // is centered against its hour band. Falls back to per-pitch labels if pitch
  // doesn't divide 60 (rare, e.g. 7-min slots).
  const timeLabels = [];
  const rowsPerHour = 60 % pitch === 0 ? 60 / pitch : 1;
  for (let r = 0; r < totalRows; r++) {
    const minute = dayStartMin + r * pitch;
    if (rowsPerHour > 1 && minute % 60 !== 0) continue;
    const hh = String(Math.floor(minute / 60)).padStart(2, "0");
    const mm = String(minute % 60).padStart(2, "0");
    timeLabels.push(
      `<div class="time-label" style="grid-column: 1; grid-row: ${r + 2} / span ${rowsPerHour}">${hh}:${mm}</div>`
    );
  }

  // Cells per day: each day uses its own duration; cell spans `dayDur/pitch` rows.
  const cellHTMLs = [];
  for (let d = 0; d < 7; d++) {
    const dayDur = dayDurations[d];
    const span = dayDur / pitch;
    const cellsPerDay = (dayEndMin - dayStartMin) / dayDur;
    const dayDate = new Date(currentWeekStart);
    dayDate.setDate(dayDate.getDate() + d);
    const dateStr = localDateStr(dayDate);
    const dayHasBlocked = (exceptionsByDate[dateStr] || []).some(
      (e) => e.exception_type === "blocked"
    );

    for (let c = 0; c < cellsPerDay; c++) {
      const slotStartMin = dayStartMin + c * dayDur;
      const slotEndMin = slotStartMin + dayDur;
      const gridRow = 2 + c * span;
      const slot = buckets[`${dateStr} ${slotStartMin}`];
      const hasAppt = !!(slot && slot.length);

      const closed = overlayAvailable && cellState(dayDate, slotStartMin, slotEndMin, rules, exceptionsByDate) === "closed";
      const classes = ["slot"];
      if (hasAppt) classes.push("has-appointment");
      else if (dayHasBlocked) classes.push("blocked");
      else if (closed) classes.push("closed");

      const styleAttr = `style="grid-column: ${d + 2}; grid-row: ${gridRow} / span ${span}"`;
      const dataAttrs = `data-date="${dateStr}" data-slot-min="${slotStartMin}"`;

      if (hasAppt) {
        slot.sort((a, b) => a.start - b.start);
        const blocks = slot
          .map(({ appt, start }) => {
            const time = fmtClock(start);
            const patient = patientsMap.get(appt.patient_id);
            const name = patient
              ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim()
              : "";
            const label = name ? `${time} · ${name}` : time;
            return `<div class="appointment-block" data-appt-id="${attr(appt.id)}" title="${attr(label)}">${esc(label)}</div>`;
          })
          .join("");
        cellHTMLs.push(`<div class="${classes.join(" ")}" ${styleAttr} ${dataAttrs}>${blocks}</div>`);
      } else {
        cellHTMLs.push(`<div class="${classes.join(" ")}" ${styleAttr} ${dataAttrs}></div>`);
      }
    }
  }

  const overlayWarning = availRes.status === "rejected"
    ? '<div class="cal-overlay-warning">לא ניתן לטעון את שעות הזמינות</div>'
    : "";

  const slotRowPx = Math.max(8, Math.round(pitch * 0.7));
  const gridRowsTemplate = `auto repeat(${totalRows}, ${slotRowPx}px)`;
  body.innerHTML = `${overlayWarning}
    <div class="week-view" style="grid-template-rows: ${gridRowsTemplate}">
      <div class="day-header" style="grid-column: 1; grid-row: 1"></div>
      ${dayHeaders}
      ${timeLabels.join("")}
      ${cellHTMLs.join("")}
    </div>`;

  body.querySelectorAll(".appointment-block").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const appt = appointments.find((a) => a.id === el.dataset.apptId);
      if (appt) showAppointmentModal(appt, patientsMap, typesMap);
    });
  });

  // Empty open slot → new booking modal. Closed/blocked/has-appointment cells stay inert.
  body.querySelectorAll(".slot:not(.has-appointment):not(.closed):not(.blocked)").forEach((el) => {
    el.addEventListener("click", () => {
      const date = el.dataset.date;
      const slotMin = parseInt(el.dataset.slotMin, 10);
      if (!date || isNaN(slotMin)) return;
      const hh = String(Math.floor(slotMin / 60)).padStart(2, "0");
      const mm = String(slotMin % 60).padStart(2, "0");
      showBookModal({ date, time: `${hh}:${mm}`, typesMap });
    });
  });
}

function cellState(date, slotStartMin, slotEndMin, rules, exceptionsByDate) {
  const dateStr = localDateStr(date);
  const dowKey = DOW_API[date.getDay()];
  const dayExceptions = exceptionsByDate[dateStr] || [];

  if (dayExceptions.some((e) => e.exception_type === "blocked" && !e.start_time && !e.end_time)) {
    return "closed";
  }
  const fullDayOverride = dayExceptions.some(
    (e) => e.exception_type === "override" && !e.start_time && !e.end_time
  );
  const partialOverrideOpen = dayExceptions.some(
    (e) =>
      e.exception_type === "override" &&
      e.start_time &&
      e.end_time &&
      timeRangesOverlap(e.start_time, e.end_time, slotStartMin, slotEndMin)
  );

  let open =
    fullDayOverride ||
    partialOverrideOpen ||
    rules.some(
      (r) =>
        r.day_of_week === dowKey &&
        (!r.effective_from || r.effective_from <= dateStr) &&
        (!r.effective_until || r.effective_until >= dateStr) &&
        timeRangesOverlap(r.start_time, r.end_time, slotStartMin, slotEndMin)
    );

  if (open) {
    const partialBlock = dayExceptions.some(
      (e) =>
        e.exception_type === "blocked" &&
        e.start_time &&
        e.end_time &&
        timeRangesOverlap(e.start_time, e.end_time, slotStartMin, slotEndMin)
    );
    if (partialBlock) open = false;
  }

  return open ? "open" : "closed";
}

function timeRangesOverlap(startStr, endStr, slotStartMin, slotEndMin) {
  const start = parseTimeToMinutes(startStr);
  const end = parseTimeToMinutes(endStr);
  return start < slotEndMin && end > slotStartMin;
}

function parseTimeToMinutes(s) {
  const [hh, mm] = s.split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

function attachShowPicker(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll('input[type="date"], input[type="time"]').forEach((inp) => {
    inp.addEventListener("click", () => {
      try { inp.showPicker?.(); } catch {}
    });
  });
}

function gcdOfArray(arr) {
  let result = arr[0];
  for (let i = 1; i < arr.length; i++) result = gcdInt(result, arr[i]);
  return result;
}

function gcdInt(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function fmtClock(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Pull HH:MM from raw slot string via regex — avoids `new Date()` to
// sidestep the clinic-local-vs-UTC mismatch documented in
// .work/project_scheduling_slots_tz_bug.md.
function slotTimeLabel(s) {
  const m = String(s).match(/T(\d{2}:\d{2})/);
  return m ? m[1] : s;
}

const APPT_STATUS_LABEL = {
  scheduled: "מתוכנן",
  cancelled: "בוטל",
  completed: "הסתיים",
  no_show: "לא הופיע",
};

const APPT_STATUS_BADGE = {
  scheduled: "badge-info",
  cancelled: "badge-danger",
  completed: "badge-success",
  no_show: "badge-warning",
};

function showAppointmentModal(appt, patientsMap, typesMap) {
  const patient = patientsMap.get(appt.patient_id);
  const type = typesMap.get(appt.appointment_type_id);
  const start = new Date(appt.start_time);
  const end = new Date(appt.end_time);
  const patientName = patient
    ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "—"
    : "—";
  const phone = patient?.phone || "";
  const typeName = type?.name || "—";
  const dateStr = fmtDate(start);
  const timeRange = `${fmtClock(start)}–${fmtClock(end)}`;
  const status = appt.status || "scheduled";
  const statusLabel = APPT_STATUS_LABEL[status] || status;
  const statusBadge = APPT_STATUS_BADGE[status] || "";
  const canCancel = status === "scheduled";
  const canReschedule = status === "scheduled" && appt.patient_id && appt.appointment_type_id;

  // State machine: 4 states (view, cancel-confirm, reschedule, reschedule-confirm).
  // If a 5th lands, refactor to per-state dispatch + state object.
  let selectedDate = localDateStr(new Date());  // YYYY-MM-DD; persists across back-nav
  let selectedSlot = null;                       // {start_time, end_time}

  const root = document.getElementById("modal-root");
  const close = () => (root.innerHTML = "");

  function renderView() {
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal">
          <h3>פרטי תור</h3>
          <div class="form-grid" style="grid-template-columns: 1fr">
            <div class="form-group">
              <label>מטופל</label>
              <div>${esc(patientName)}</div>
            </div>
            <div class="form-group">
              <label>טלפון</label>
              <div>${phone ? `<a href="tel:${attr(phone)}">${esc(phone)}</a>` : "—"}</div>
            </div>
            <div class="form-group">
              <label>סוג תור</label>
              <div>${esc(typeName)}</div>
            </div>
            <div class="form-group">
              <label>תאריך</label>
              <div>${esc(dateStr)}</div>
            </div>
            <div class="form-group">
              <label>שעה</label>
              <div>${esc(timeRange)}</div>
            </div>
            <div class="form-group">
              <label>סטטוס</label>
              <div><span class="badge ${statusBadge}">${esc(statusLabel)}</span></div>
            </div>
            <div class="form-group">
              <label>הערות</label>
              <div style="word-break: break-word; white-space: pre-wrap">${esc(appt.notes || "—")}</div>
            </div>
          </div>
          <div class="form-actions">
            ${canReschedule ? `<button class="btn btn-primary" id="appt-reschedule">תזמן מחדש</button>` : ""}
            ${canCancel ? `<button class="btn btn-danger" id="appt-cancel">בטל תור</button>` : ""}
            <button class="btn btn-secondary" id="appt-close">סגור</button>
          </div>
        </div>
      </div>`;
    document.getElementById("appt-close").addEventListener("click", close);
    document.getElementById("modal-bg").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) close();
    });
    if (canCancel) {
      document.getElementById("appt-cancel").addEventListener("click", renderCancelConfirm);
    }
    if (canReschedule) {
      document.getElementById("appt-reschedule").addEventListener("click", renderReschedule);
    }
  }

  function renderCancelConfirm() {
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal">
          <h3>ביטול תור</h3>
          <p style="margin: 0.5rem 0 1rem">
            האם לבטל את התור של ${esc(patientName)} בתאריך ${esc(dateStr)} בשעה ${esc(fmtClock(start))}?
          </p>
          <div class="form-actions">
            <button class="btn btn-danger" id="appt-cancel-yes">כן, בטל את התור</button>
            <button class="btn btn-secondary" id="appt-cancel-no">חזור</button>
          </div>
        </div>
      </div>`;
    document.getElementById("appt-cancel-no").addEventListener("click", renderView);
    document.getElementById("modal-bg").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) close();
    });
    document.getElementById("appt-cancel-yes").addEventListener("click", async () => {
      const btn = document.getElementById("appt-cancel-yes");
      btn.disabled = true;
      btn.textContent = "מבטל...";
      try {
        await api.cancelAppointment(appt.id);
        toast("התור בוטל", "success");
        close();
        loadCalendar();
      } catch (err) {
        if (err.name === "TypeError") {
          // Network/offline failure — actual server state is uncertain.
          toast("לא ברור אם הביטול בוצע — רענן לבדוק", "error");
          close();
        } else {
          // HTTP error — stay in confirm so user can retry.
          btn.disabled = false;
          btn.textContent = "כן, בטל את התור";
          toast(`שגיאה: ${err.message}`, "error");
        }
      }
    });
  }

  function renderReschedule() {
    selectedSlot = null;  // clear any prior selection when entering this state
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal">
          <h3>תזמון מחדש</h3>
          <p style="margin: 0 0 0.75rem; color: var(--text-secondary); font-size: 0.9rem">
            תור נוכחי: ${esc(dateStr)} ${esc(fmtClock(start))} · ${esc(patientName)}
          </p>
          <div class="form-grid" style="grid-template-columns: 1fr">
            <div class="form-group">
              <label>תאריך חדש</label>
              <input type="date" id="resched-date" value="${attr(selectedDate)}" required>
            </div>
          </div>
          <div id="resched-slots" style="margin-top: 0.75rem; min-height: 2.5rem"></div>
          <div class="form-actions">
            <button class="btn btn-secondary" id="resched-back">חזור</button>
          </div>
        </div>
      </div>`;
    attachShowPicker(document.getElementById("modal-bg"));
    document.getElementById("resched-back").addEventListener("click", renderView);
    document.getElementById("modal-bg").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) close();
    });
    const dateInput = document.getElementById("resched-date");
    dateInput.addEventListener("change", () => {
      selectedDate = dateInput.value;
      fetchAndRenderSlots();
    });
    fetchAndRenderSlots();
  }

  // Reads closure values (doctorId, appt.appointment_type_id, selectedDate).
  // #3c (empty-slot booking) will need this with different params — factor to
  // module level with {doctorId, date, appointmentTypeId, onPick} when implementing #3c.
  async function fetchAndRenderSlots() {
    const slotsEl = document.getElementById("resched-slots");
    if (!slotsEl) return;  // user navigated away mid-fetch
    if (!selectedDate) {
      slotsEl.innerHTML = '<div class="empty" style="padding:1rem">בחר תאריך</div>';
      return;
    }
    slotsEl.innerHTML = '<div class="loading">טוען זמינות...</div>';
    try {
      const raw = await api.getSlots({
        doctor_id: doctorId,
        date: selectedDate,
        appointment_type_id: appt.appointment_type_id,
      });
      const sorted = (Array.isArray(raw) ? raw : []).slice()
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (!sorted.length) {
        slotsEl.innerHTML = '<div class="empty" style="padding:1rem">אין זמינות בתאריך זה</div>';
        return;
      }
      slotsEl.innerHTML = `
        <label style="display:block;font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.4rem">בחר שעה</label>
        <div class="slot-chips">
          ${sorted.map((s) => `<button class="btn btn-secondary btn-sm slot-chip" data-start="${attr(s.start_time)}" data-end="${attr(s.end_time)}">${esc(slotTimeLabel(s.start_time))}</button>`).join("")}
        </div>`;
      slotsEl.querySelectorAll(".slot-chip").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedSlot = { start_time: btn.dataset.start, end_time: btn.dataset.end };
          renderRescheduleConfirm();
        });
      });
    } catch (err) {
      slotsEl.innerHTML = `<div class="form-error">שגיאה בטעינת זמינות: ${esc(err.message)}</div>`;
    }
  }

  function renderRescheduleConfirm() {
    if (!selectedSlot) return renderReschedule();
    const newDateDisp = selectedDate;
    const newTimeDisp = slotTimeLabel(selectedSlot.start_time);
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal">
          <h3>אישור תזמון מחדש</h3>
          <p style="margin: 0.5rem 0 1rem">
            לתזמן את התור של ${esc(patientName)}<br>
            מ-${esc(dateStr)} ${esc(fmtClock(start))}<br>
            ל-${esc(newDateDisp)} ${esc(newTimeDisp)}?
          </p>
          <div class="form-actions">
            <button class="btn btn-primary" id="resched-yes">אישור</button>
            <button class="btn btn-secondary" id="resched-no">חזור</button>
          </div>
        </div>
      </div>`;
    document.getElementById("resched-no").addEventListener("click", renderReschedule);
    document.getElementById("modal-bg").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) close();
    });
    document.getElementById("resched-yes").addEventListener("click", handleRescheduleConfirm);
  }

  async function handleRescheduleConfirm() {
    // TZ-safe same-slot guard — compare local-date+HH:MM keys, not raw strings.
    // (slot strings are clinic-local; appt.start_time is UTC ISO — textually different
    //  even for the same instant.)
    const oldKey = `${localDateStr(start)} ${fmtClock(start)}`;
    const newKey = `${selectedDate} ${slotTimeLabel(selectedSlot.start_time)}`;
    if (oldKey === newKey) {
      toast("השעה זהה לתור הקיים", "error");
      return;
    }

    const btn = document.getElementById("resched-yes");
    btn.disabled = true;
    btn.textContent = "מתזמן...";

    // Phase 1: book new
    try {
      await api.bookAppointment({
        doctor_id: doctorId,
        patient_id: appt.patient_id,
        appointment_type_id: appt.appointment_type_id,
        start_time: selectedSlot.start_time,
        booked_by: "staff",
        notes: appt.notes || null,
      });
    } catch (err) {
      if (err.name === "TypeError") {
        // Network failure — original intact, but unclear if a duplicate landed.
        toast("שגיאת רשת — רענן לבדוק אם נוצר תור כפול", "error");
        close();
        loadCalendar();
        return;
      }
      // HTTP error: original is intact, stay in confirm so user can retry.
      btn.disabled = false;
      btn.textContent = "אישור";
      toast(`שגיאה בקביעת התור החדש: ${err.message}`, "error");
      return;
    }

    // Phase 2: cancel original
    try {
      await api.cancelAppointment(appt.id);
      toast("התור תוזמן מחדש", "success");
      close();
      loadCalendar();
    } catch (err) {
      const msg = err.name === "TypeError"
        ? "התור החדש נוצר אך הביטול לא ברור — רענן לבדוק"
        : "התור החדש נוצר אך הביטול נכשל — בדוק ידנית";
      toast(msg, "error");
      close();
      loadCalendar();
    }
  }

  renderView();
}

function showBookModal({ date, time, typesMap }) {
  let selectedPatient = null;
  let selectedTypeId = "";
  let createMode = false;
  let searchTimer = null;
  let searchResults = [];

  const root = document.getElementById("modal-root");
  const close = () => (root.innerHTML = "");

  // Active types for the dropdown.
  const activeTypes = [...typesMap.values()].filter((t) => t.is_active !== false);

  function render() {
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal">
          <h3>תור חדש</h3>
          <p style="margin: 0 0 0.75rem; color: var(--text-secondary); font-size: 0.9rem">
            ${esc(date)} בשעה ${esc(time)}
          </p>
          <div class="form-grid" style="grid-template-columns: 1fr">
            <div class="form-group">
              <label>מטופל</label>
              <div id="book-patient-section"></div>
            </div>
            <div class="form-group">
              <label>סוג תור</label>
              <select id="book-type">
                <option value="">— בחר —</option>
                ${activeTypes.map((t) => `<option value="${attr(t.id)}" ${t.id === selectedTypeId ? "selected" : ""}>${esc(t.name)} (${t.duration_minutes} דק׳)</option>`).join("")}
              </select>
              ${!activeTypes.length ? '<small style="color:var(--danger)">אין סוגי תורים פעילים לרופא זה</small>' : ""}
            </div>
          </div>
          <div class="form-error" id="book-error" style="display:none"></div>
          <div class="form-actions">
            <button class="btn btn-primary" id="book-yes" disabled>אישור</button>
            <button class="btn btn-secondary" id="book-no">ביטול</button>
          </div>
        </div>
      </div>`;

    document.getElementById("book-no").addEventListener("click", close);
    document.getElementById("modal-bg").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) close();
    });
    document.getElementById("book-type").addEventListener("change", (e) => {
      selectedTypeId = e.target.value;
      updateBookEnabled();
    });
    document.getElementById("book-yes").addEventListener("click", handleBookConfirm);

    renderPatientSection();
    updateBookEnabled();
  }

  function renderPatientSection() {
    const sec = document.getElementById("book-patient-section");
    if (!sec) return;

    if (selectedPatient) {
      sec.innerHTML = `
        <div style="display:flex;gap:0.5rem;align-items:center;padding:0.5rem 0.75rem;background:var(--primary-light);border-radius:var(--radius)">
          <span style="font-weight:600">${esc(selectedPatient.first_name)} ${esc(selectedPatient.last_name)}</span>
          <span style="color:var(--text-secondary);font-size:0.85rem">${esc(selectedPatient.phone || "")}</span>
          <button class="btn btn-secondary btn-sm" id="patient-clear" style="margin-right:auto">החלף</button>
        </div>`;
      document.getElementById("patient-clear").addEventListener("click", () => {
        selectedPatient = null;
        renderPatientSection();
        updateBookEnabled();
      });
      return;
    }

    if (createMode) {
      sec.innerHTML = `
        <div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem">
          <div class="form-grid">
            <div class="form-group"><label>שם פרטי</label><input id="np-first" required></div>
            <div class="form-group"><label>שם משפחה</label><input id="np-last" required></div>
            <div class="form-group" style="grid-column:1/-1"><label>טלפון</label><input id="np-phone" type="tel" required></div>
          </div>
          <div class="form-error" id="np-error" style="display:none"></div>
          <div class="form-actions">
            <button class="btn btn-primary btn-sm" id="np-create">צור והשתמש</button>
            <button class="btn btn-secondary btn-sm" id="np-cancel">ביטול</button>
          </div>
        </div>`;
      document.getElementById("np-cancel").addEventListener("click", () => {
        createMode = false;
        renderPatientSection();
      });
      document.getElementById("np-create").addEventListener("click", handleCreatePatient);
      return;
    }

    // Default: search mode
    sec.innerHTML = `
      <input type="search" id="book-patient-search" placeholder="חיפוש לפי שם או טלפון..." autocomplete="off">
      <div id="book-patient-results" style="margin-top:0.4rem;max-height:200px;overflow-y:auto"></div>
      <button class="btn btn-secondary btn-sm" id="book-patient-create-btn" style="margin-top:0.4rem">+ הוסף מטופל חדש</button>`;
    document.getElementById("book-patient-create-btn").addEventListener("click", () => {
      createMode = true;
      renderPatientSection();
    });
    const searchInput = document.getElementById("book-patient-search");
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim();
      clearTimeout(searchTimer);
      if (!q) {
        const r = document.getElementById("book-patient-results");
        if (r) r.innerHTML = "";
        return;
      }
      searchTimer = setTimeout(() => doSearch(q), 300);
    });
    searchInput.focus();
  }

  async function doSearch(q) {
    const resultsEl = document.getElementById("book-patient-results");
    if (!resultsEl) return;
    resultsEl.innerHTML = '<div class="loading" style="padding:0.5rem">מחפש...</div>';
    try {
      const results = await api.searchPatients(q);
      searchResults = Array.isArray(results) ? results : [];
      if (!searchResults.length) {
        resultsEl.innerHTML = '<div class="empty" style="padding:0.5rem">לא נמצא. ניתן להוסיף מטופל חדש למטה.</div>';
        return;
      }
      resultsEl.innerHTML = searchResults
        .map((p) => `
          <div style="display:flex;gap:0.5rem;align-items:center;padding:0.4rem 0.75rem;border-bottom:1px solid var(--border)">
            <span style="font-weight:600">${esc(p.first_name)} ${esc(p.last_name)}</span>
            <span style="color:var(--text-secondary);font-size:0.85rem">${esc(p.phone || "")}</span>
            <button class="btn btn-primary btn-sm" data-patient-id="${attr(p.id)}" style="margin-right:auto">בחר</button>
          </div>`)
        .join("");
      resultsEl.querySelectorAll("button[data-patient-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const p = searchResults.find((x) => x.id === btn.dataset.patientId);
          if (p) {
            selectedPatient = p;
            renderPatientSection();
            updateBookEnabled();
          }
        });
      });
    } catch (err) {
      resultsEl.innerHTML = `<div class="form-error">${esc(err.message)}</div>`;
    }
  }

  async function handleCreatePatient() {
    const firstName = document.getElementById("np-first").value.trim();
    const lastName = document.getElementById("np-last").value.trim();
    const phone = document.getElementById("np-phone").value.trim();
    const errEl = document.getElementById("np-error");
    const showNpErr = (msg) => {
      errEl.textContent = msg;
      errEl.style.display = msg ? "" : "none";
    };
    if (!firstName) return showNpErr("שם פרטי חובה");
    if (!lastName) return showNpErr("שם משפחה חובה");
    if (!phone) return showNpErr("טלפון חובה");
    showNpErr("");
    const btn = document.getElementById("np-create");
    btn.disabled = true;
    btn.textContent = "יוצר...";
    try {
      const created = await api.createPatient({
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      selectedPatient = created;
      createMode = false;
      renderPatientSection();
      updateBookEnabled();
      toast("המטופל נוצר", "success");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "צור והשתמש";
      showNpErr(err.message);
    }
  }

  function updateBookEnabled() {
    const btn = document.getElementById("book-yes");
    if (!btn) return;
    btn.disabled = !(selectedPatient && selectedTypeId && activeTypes.length);
  }

  async function handleBookConfirm() {
    const btn = document.getElementById("book-yes");
    const errEl = document.getElementById("book-error");
    const showErr = (msg) => {
      errEl.textContent = msg;
      errEl.style.display = msg ? "" : "none";
    };
    showErr("");
    btn.disabled = true;
    btn.textContent = "מתזמן...";
    const start_time = `${date}T${time}:00`;
    try {
      await api.bookAppointment({
        doctor_id: doctorId,
        patient_id: selectedPatient.id,
        appointment_type_id: selectedTypeId,
        start_time,
        booked_by: "staff",
        notes: null,
      });
      toast("התור נקבע", "success");
      close();
      loadCalendar();
    } catch (err) {
      if (err.name === "TypeError") {
        toast("שגיאת רשת — רענן לבדוק אם נקבע תור", "error");
        close();
        loadCalendar();
        return;
      }
      btn.disabled = false;
      btn.textContent = "אישור";
      showErr(err.message);
    }
  }

  render();
}

/* ---- Messages ---- */

let messagesPage = { offset: 0, limit: 20, status: "pending,read", total: 0 };

const MSG_STATUS_LABEL = {
  pending: "ממתינה",
  read: "נקראה",
  replied: "נענתה",
  archived: "בארכיון",
};

const MSG_STATUS_BADGE = {
  pending: "badge-warning",
  read: "badge-info",
  replied: "badge-success",
  archived: "",
};

async function loadMessages() {
  const body = document.querySelector("#messages-section .section-body");
  body.innerHTML = '<div class="loading">טוען...</div>';
  try {
    const res = await api.listMessages(doctorId, messagesPage);
    messagesPage.total = res.total ?? 0;
    renderMessages(res.items || []);
  } catch (err) {
    body.innerHTML = `<div class="empty">שגיאה בטעינת הודעות: ${esc(err.message)}</div>`;
  }
}

function renderMessages(items) {
  const body = document.querySelector("#messages-section .section-body");

  if (!items.length) {
    body.innerHTML = '<div class="empty">אין הודעות</div>';
    return;
  }

  const rows = items
    .map((m) => {
      const created = new Date(m.created_at).toLocaleString("he-IL");
      const nameOrPhone = m.patient_name
        ? `${esc(m.patient_name)} · ${esc(m.patient_phone)}`
        : esc(m.patient_phone);
      const badge = MSG_STATUS_BADGE[m.status] || "";
      const label = MSG_STATUS_LABEL[m.status] || m.status;

      let actions = "";
      if (m.status === "pending") {
        actions = `
          <button class="btn btn-secondary btn-sm" data-msg-id="${attr(m.id)}" data-msg-action="read">סמן כנקראה</button>
          <button class="btn btn-secondary btn-sm" data-msg-id="${attr(m.id)}" data-msg-action="archived">העבר לארכיון</button>`;
      } else if (m.status === "read") {
        actions = `
          <button class="btn btn-secondary btn-sm" data-msg-id="${attr(m.id)}" data-msg-action="replied">סמן כנענתה</button>
          <button class="btn btn-secondary btn-sm" data-msg-id="${attr(m.id)}" data-msg-action="archived">העבר לארכיון</button>`;
      } else if (m.status === "replied") {
        actions = `
          <button class="btn btn-secondary btn-sm" data-msg-id="${attr(m.id)}" data-msg-action="archived">העבר לארכיון</button>`;
      } else if (m.status === "archived") {
        actions = `
          <button class="btn btn-secondary btn-sm" data-msg-id="${attr(m.id)}" data-msg-action="read">שחזר</button>`;
      }

      return `
        <div class="msg-row ${esc(m.status)}">
          <div class="msg-content">
            <div class="msg-meta">
              <span class="msg-name">${nameOrPhone}</span>
              <span class="badge ${badge}">${esc(label)}</span>
              <span class="msg-time">${esc(created)}</span>
            </div>
            <div class="msg-body">${esc(m.body)}</div>
          </div>
          <div class="msg-actions">${actions}</div>
        </div>`;
    })
    .join("");

  const start = messagesPage.offset + 1;
  const end = messagesPage.offset + items.length;
  const total = messagesPage.total;
  const hasPrev = messagesPage.offset > 0;
  const hasNext = end < total;

  const pagination = `
    <div class="msg-pagination">
      <span>מוצגות ${start}-${end} מתוך ${total}</span>
      <div style="display:flex;gap:0.4rem">
        <button class="btn btn-secondary btn-sm" id="msg-prev" ${hasPrev ? "" : "disabled"}>הקודם</button>
        <button class="btn btn-secondary btn-sm" id="msg-next" ${hasNext ? "" : "disabled"}>הבא</button>
      </div>
    </div>`;

  body.innerHTML = `<div class="msg-list">${rows}</div>${pagination}`;

  body.querySelectorAll("button[data-msg-action]").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleMessageAction(btn.dataset.msgId, btn.dataset.msgAction)
    );
  });

  if (hasPrev) {
    document.getElementById("msg-prev").addEventListener("click", () => {
      messagesPage.offset = Math.max(0, messagesPage.offset - messagesPage.limit);
      loadMessages();
    });
  }
  if (hasNext) {
    document.getElementById("msg-next").addEventListener("click", () => {
      messagesPage.offset += messagesPage.limit;
      loadMessages();
    });
  }
}

async function handleMessageAction(messageId, status) {
  try {
    await api.updateMessageStatus(messageId, status);
    toast("הסטטוס עודכן", "success");
    loadMessages();
  } catch (err) {
    toast(`שגיאה: ${err.message}`, "error");
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

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toast(message, type) {
  const c = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
