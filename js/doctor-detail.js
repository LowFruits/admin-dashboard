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
      const dataAttrs = `data-date="${dateStr}" data-slot-min="${slotStartMin}" data-day-dur="${dayDur}"`;

      if (hasAppt) {
        slot.sort((a, b) => a.start - b.start);
        const blocks = slot
          .map(({ appt, start }) => {
            const end = new Date(appt.end_time);
            const apptStartMin = start.getHours() * 60 + start.getMinutes();
            const apptEndMin = end.getHours() * 60 + end.getMinutes();
            const rawTopPct = ((apptStartMin - slotStartMin) / dayDur) * 100;
            const rawHeightPct = ((apptEndMin - apptStartMin) / dayDur) * 100;
            const safeTop = Number.isFinite(rawTopPct) ? rawTopPct : 0;
            const safeHeight = Number.isFinite(rawHeightPct) ? rawHeightPct : 100;
            const topPct = Math.max(0, Math.min(100, safeTop));
            const heightPct = Math.max(0, Math.min(100 - topPct, safeHeight));
            const blockStyle = `style="top: ${topPct}%; height: ${heightPct}%;"`;

            const time = fmtClock(start);
            const patient = patientsMap.get(appt.patient_id);
            const name = patient
              ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim()
              : "";
            const label = name ? `${time} · ${name}` : time;
            return `<div class="appointment-block" ${blockStyle} data-appt-id="${attr(appt.id)}" title="${attr(label)}">${esc(label)}</div>`;
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

  // Unified cell click → snap Y position to nearest 15-min in-cell anchor.
  // Has-appointment cells filter anchors to empty sub-windows so the snap
  // can't land on an occupied minute. Block clicks call stopPropagation,
  // so they won't trigger this handler. Closed/blocked cells stay inert.
  body.querySelectorAll(".slot:not(.closed):not(.blocked)").forEach((el) => {
    el.addEventListener("click", (e) => {
      const date = el.dataset.date;
      const slotMin = parseInt(el.dataset.slotMin, 10);
      const dayDur = parseInt(el.dataset.dayDur, 10);
      if (!date || isNaN(slotMin) || isNaN(dayDur)) return;

      const anchorOffsets = [];
      for (let m = 0; m < dayDur; m += 15) anchorOffsets.push(m);

      let validAnchors = anchorOffsets;
      if (el.classList.contains("has-appointment")) {
        const slotEndMin = slotMin + dayDur;
        const bucket = buckets[`${date} ${slotMin}`] || [];
        const sorted = [...bucket].sort((a, b) => a.start - b.start);
        const windows = [];
        let cursor = slotMin;
        for (const { appt, start } of sorted) {
          const aStart = start.getHours() * 60 + start.getMinutes();
          const aEndDate = new Date(appt.end_time);
          const aEnd = aEndDate.getHours() * 60 + aEndDate.getMinutes();
          if (aStart > cursor) windows.push([cursor, aStart]);
          cursor = Math.max(cursor, aEnd);
        }
        if (cursor < slotEndMin) windows.push([cursor, slotEndMin]);
        validAnchors = anchorOffsets.filter((off) =>
          windows.some(([s, e]) => slotMin + off >= s && slotMin + off < e)
        );
        if (!validAnchors.length) return;
      }

      const rect = el.getBoundingClientRect();
      const clickOffset = Math.max(
        0,
        Math.min(dayDur, ((e.clientY - rect.top) / rect.height) * dayDur)
      );
      const snapped = validAnchors.reduce(
        (best, a) =>
          Math.abs(a - clickOffset) < Math.abs(best - clickOffset) ? a : best,
        validAnchors[0]
      );

      const totalMin = slotMin + snapped;
      const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
      const mm = String(totalMin % 60).padStart(2, "0");
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

// Display helpers — pure, module-level.
function formatDob(iso) {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function truncForDiff(s, n = 80) {
  const v = String(s || "—");
  return v.length > n ? v.slice(0, n) + "…" : v;
}

// Fetches slots for a (doctor, date, appointment-type) tuple.
// Returns a sorted array; empty array if backend returns null/non-array.
// Throws on network/HTTP errors — callers must catch.
async function fetchAvailableSlots({ doctorId, date, appointmentTypeId }) {
  const raw = await api.getSlots({
    doctor_id: doctorId,
    date,
    appointment_type_id: appointmentTypeId,
  });
  return (Array.isArray(raw) ? raw : []).slice().sort(
    (a, b) => a.start_time.localeCompare(b.start_time)
  );
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
  const canEdit = status === "scheduled" && appt.patient_id && appt.appointment_type_id;

  // Edit-flow closure state.
  const original = {
    date: localDateStr(start),
    time: fmtClock(start),
    startTime: appt.start_time,
    type_id: appt.appointment_type_id,
    notes: appt.notes || "",
  };
  const editForm = {
    date: original.date,
    selectedSlot: null,                 // {start_time, end_time}; null means "no time change"
    type_id: original.type_id,
    notes: original.notes,
  };
  let editFetchSeq = 0;                  // race guard for slot fetch on date/type change

  // Build type dropdown list — include current type even if deactivated; flag if deleted.
  const activeTypes = [...typesMap.values()].filter((t) => t.is_active !== false);
  const editTypes = activeTypes.slice();
  let originalTypeMissing = false;
  if (!editTypes.find((t) => t.id === original.type_id)) {
    const cur = typesMap.get(original.type_id);
    if (cur) {
      editTypes.unshift({ ...cur, _inactive: true });
    } else {
      originalTypeMissing = true;
    }
  }

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
            ${canEdit ? `<button class="btn btn-primary" id="appt-edit">ערוך תור</button>` : ""}
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
    if (canEdit) {
      document.getElementById("appt-edit").addEventListener("click", renderEdit);
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

  function renderEdit() {
    const typeOpts = editTypes.map((t) => `
      <option value="${attr(t.id)}" ${t.id === editForm.type_id ? "selected" : ""}>
        ${esc(t.name)} (${t.duration_minutes} דק׳)${t._inactive ? " (לא פעיל)" : ""}
      </option>`).join("");

    root.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal">
          <h3>ערוך תור</h3>
          <div class="patient-readonly">
            מטופל: ${esc(patientName)}${phone ? ` · ${esc(phone)}` : ""}
          </div>
          ${originalTypeMissing
            ? '<div class="form-warning">סוג התור המקורי לא נמצא — בחר סוג חדש</div>'
            : ""}
          <div class="form-grid" style="grid-template-columns: 1fr">
            <div class="form-group">
              <label>סוג תור</label>
              <select id="edit-type">${typeOpts}</select>
            </div>
            <div class="form-group">
              <label>תאריך</label>
              <input type="date" id="edit-date" value="${attr(editForm.date)}">
            </div>
            <div class="form-group">
              <label>שעה</label>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.4rem">
                שעה נוכחית: ${esc(original.time)} — לחץ על שעה אחרת כדי לשנות
              </div>
              <div id="edit-slots" style="min-height: 2.5rem"></div>
            </div>
            <div class="form-group">
              <label>הערות</label>
              <textarea id="edit-notes" rows="3" style="width: 100%; box-sizing: border-box; font-family: inherit">${esc(editForm.notes)}</textarea>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="edit-save">שמור</button>
            <button class="btn btn-secondary" id="edit-cancel">ביטול</button>
          </div>
        </div>
      </div>`;
    attachShowPicker(document.getElementById("modal-bg"));
    document.getElementById("edit-cancel").addEventListener("click", renderView);
    document.getElementById("modal-bg").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) close();
    });
    document.getElementById("edit-type").addEventListener("change", (e) => {
      editForm.type_id = e.target.value;
      editForm.selectedSlot = null;
      fetchAndRenderEditSlots();
      updateEditSaveEnabled();
    });
    const dateInput = document.getElementById("edit-date");
    dateInput.addEventListener("change", () => {
      editForm.date = dateInput.value;
      editForm.selectedSlot = null;
      fetchAndRenderEditSlots();
      updateEditSaveEnabled();
    });
    document.getElementById("edit-notes").addEventListener("input", (e) => {
      editForm.notes = e.target.value;
      updateEditSaveEnabled();
    });
    document.getElementById("edit-save").addEventListener("click", renderEditConfirm);

    fetchAndRenderEditSlots();
    updateEditSaveEnabled();
  }

  async function fetchAndRenderEditSlots() {
    const slotsEl = document.getElementById("edit-slots");
    if (!slotsEl) return;
    editFetchSeq++;
    const seq = editFetchSeq;
    slotsEl.innerHTML = '<div class="loading">טוען זמינות...</div>';
    let sorted;
    try {
      sorted = await fetchAvailableSlots({
        doctorId,
        date: editForm.date,
        appointmentTypeId: editForm.type_id,
      });
    } catch (err) {
      if (seq !== editFetchSeq) return;
      slotsEl.innerHTML = `<div class="form-error">שגיאה בטעינת זמינות: ${esc(err.message)}</div>`;
      return;
    }
    if (seq !== editFetchSeq) return;

    if (!sorted.length) {
      slotsEl.innerHTML = '<div class="empty" style="padding:0.5rem">אין זמינות בתאריך זה</div>';
      return;
    }
    const sameContext = editForm.date === original.date && editForm.type_id === original.type_id;
    slotsEl.innerHTML = `
      <div class="slot-chips">
        ${sorted.map((s) => {
          const label = slotTimeLabel(s.start_time);
          const isCurrent = sameContext && label === original.time;
          const isPicked = editForm.selectedSlot && editForm.selectedSlot.start_time === s.start_time;
          const cls = `btn btn-secondary btn-sm slot-chip${isCurrent ? " slot-chip-current" : ""}${isPicked ? " slot-chip-picked" : ""}`;
          return `<button class="${cls}" data-start="${attr(s.start_time)}" data-end="${attr(s.end_time)}">${esc(label)}</button>`;
        }).join("")}
      </div>`;
    slotsEl.querySelectorAll(".slot-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        editForm.selectedSlot = { start_time: btn.dataset.start, end_time: btn.dataset.end };
        fetchAndRenderEditSlots();
        updateEditSaveEnabled();
      });
    });
  }

  function canEditSave() {
    // Date changed → must pick a slot in the new date.
    if (editForm.date !== original.date && !editForm.selectedSlot) return false;
    // Original type was deleted → must pick a different type before save.
    if (originalTypeMissing && editForm.type_id === original.type_id) return false;
    return true;
  }
  function updateEditSaveEnabled() {
    const btn = document.getElementById("edit-save");
    if (btn) btn.disabled = !canEditSave();
  }

  function renderEditConfirm() {
    const newStartTime = editForm.selectedSlot ? editForm.selectedSlot.start_time : original.startTime;

    // Compute diff rows
    const noTimeChange = newStartTime === original.startTime;
    const noTypeChange = editForm.type_id === original.type_id;
    const noNotesChange = (editForm.notes || "").trim() === (original.notes || "").trim();
    if (noTimeChange && noTypeChange && noNotesChange) {
      toast("אין שינויים לשמירה", "error");
      return;
    }

    const diffRows = [];
    if (!noTypeChange) {
      const oldTypeName = (typesMap.get(original.type_id) || {}).name || "—";
      const newTypeName = (typesMap.get(editForm.type_id) || {}).name || "—";
      diffRows.push(`<div><span class="muted">סוג תור:</span> ${esc(oldTypeName)} → ${esc(newTypeName)}</div>`);
    }
    if (!noTimeChange) {
      const newDate = editForm.date;
      const newTime = editForm.selectedSlot ? slotTimeLabel(editForm.selectedSlot.start_time) : original.time;
      diffRows.push(`<div><span class="muted">תאריך+שעה:</span> ${esc(original.date)} ${esc(original.time)} → ${esc(newDate)} ${esc(newTime)}</div>`);
    }
    if (!noNotesChange) {
      const oldNotes = truncForDiff(original.notes);
      const newNotes = truncForDiff(editForm.notes);
      diffRows.push(`<div title="${attr(`${original.notes}\n→\n${editForm.notes}`)}"><span class="muted">הערות:</span> "${esc(oldNotes)}" → "${esc(newNotes)}"</div>`);
    }

    root.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal">
          <h3>אישור עריכת תור</h3>
          <p style="margin: 0 0 0.5rem; color: var(--text-secondary); font-size: 0.9rem">
            שינויים עבור ${esc(patientName)}:
          </p>
          <div style="display: grid; gap: 0.3rem; font-size: 0.9rem; margin-bottom: 1rem">
            ${diffRows.join("")}
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="edit-yes">אישור</button>
            <button class="btn btn-secondary" id="edit-no">חזור</button>
          </div>
        </div>
      </div>`;
    document.getElementById("edit-no").addEventListener("click", renderEdit);
    document.getElementById("modal-bg").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) close();
    });
    document.getElementById("edit-yes").addEventListener("click", () => performEditSave(newStartTime));
  }

  async function performEditSave(newStartTime) {
    const btn = document.getElementById("edit-yes");
    btn.disabled = true;
    btn.textContent = "שומר...";

    const sameStart = newStartTime === original.startTime;
    const newPayload = {
      doctor_id: doctorId,
      patient_id: appt.patient_id,
      appointment_type_id: editForm.type_id,
      start_time: newStartTime,
      booked_by: "staff",
      notes: (editForm.notes || "").trim() || null,
    };

    if (sameStart) {
      // Same-time edit: slot is occupied by original. Cancel first.
      try {
        await api.cancelAppointment(appt.id);
      } catch (err) {
        // Original intact — surface error and let user retry.
        btn.disabled = false;
        btn.textContent = "אישור";
        toast(`שגיאה בעדכון התור: ${err.message}`, "error");
        return;
      }

      if (!document.getElementById("edit-yes")) {
        // Modal closed mid-flight after cancel succeeded → calendar still
        // shows the now-cancelled appointment until next refresh. Fire it.
        loadCalendar();
        return;
      }

      // Cancel succeeded → original is gone. Now book at the same slot.
      try {
        await api.bookAppointment(newPayload);
        toast("התור עודכן", "success");
        close();
        loadCalendar();
      } catch (err) {
        // Cancel succeeded but book failed — patient's slot is gone.
        // Switch to a recovery panel with retry option.
        renderEditRecovery(newPayload, err);
      }
      return;
    }

    // Time-changing edit: new slot is empty, book first to preserve original
    // until we know the new booking landed.
    try {
      await api.bookAppointment(newPayload);
    } catch (err) {
      if (err.name === "TypeError") {
        toast("שגיאת רשת — רענן לבדוק אם נוצר תור כפול", "error");
        close();
        loadCalendar();
        return;
      }
      btn.disabled = false;
      btn.textContent = "אישור";
      toast(`שגיאה ביצירת תור חדש: ${err.message}`, "error");
      return;
    }

    if (!document.getElementById("edit-yes")) return;

    try {
      await api.cancelAppointment(appt.id);
      toast("התור עודכן", "success");
      close();
      loadCalendar();
    } catch (err) {
      const alreadyGone = (err.status === 404)
        || /already.*cancel|כבר.*בוטל/i.test(err.message || "");
      if (alreadyGone) {
        toast("התור עודכן", "success");
        close();
        loadCalendar();
        return;
      }
      const msg = err.name === "TypeError"
        ? "התור החדש נוצר אך הביטול לא ברור — רענן לבדוק"
        : "התור החדש נוצר אך הביטול נכשל — בדוק ידנית";
      toast(msg, "error");
      close();
      loadCalendar();
    }
  }

  function renderEditRecovery(retryPayload, lastErr) {
    const timeDisp = slotTimeLabel(retryPayload.start_time);
    const dateDisp = retryPayload.start_time.slice(0, 10);
    const typeName = (typesMap.get(retryPayload.appointment_type_id) || {}).name || "—";

    root.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal">
          <h3 style="color: var(--danger)">שגיאת עדכון</h3>
          <div class="form-error" style="display: block; margin-bottom: 1rem">
            התור המקורי בוטל, אך יצירת התור החדש נכשלה:<br>
            <code style="font-size: 0.85rem">${esc(lastErr.message || "שגיאה לא ידועה")}</code>
          </div>
          <p style="margin: 0 0 0.5rem; color: var(--text-secondary); font-size: 0.9rem">
            פרטי התור לשחזור:
          </p>
          <div class="patient-readonly" style="margin-bottom: 0.75rem">
            <div><span class="muted">מטופל:</span> ${esc(patientName)}${phone ? ` · ${esc(phone)}` : ""}</div>
            <div><span class="muted">תאריך:</span> ${esc(dateDisp)}</div>
            <div><span class="muted">שעה:</span> ${esc(timeDisp)}</div>
            <div><span class="muted">סוג:</span> ${esc(typeName)}</div>
            <div><span class="muted">הערות:</span> ${esc(retryPayload.notes || "—")}</div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" id="recovery-retry">נסה שוב</button>
            <button class="btn btn-secondary" id="recovery-close">סגור</button>
          </div>
        </div>
      </div>`;

    document.getElementById("recovery-close").addEventListener("click", () => {
      close();
      loadCalendar();
    });
    document.getElementById("modal-bg").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        close();
        loadCalendar();
      }
    });
    document.getElementById("recovery-retry").addEventListener("click", async () => {
      const retryBtn = document.getElementById("recovery-retry");
      retryBtn.disabled = true;
      retryBtn.textContent = "מנסה...";
      try {
        await api.bookAppointment(retryPayload);
        toast("התור עודכן", "success");
        close();
        loadCalendar();
      } catch (err) {
        // Modal might be closed mid-retry.
        const btnNow = document.getElementById("recovery-retry");
        if (!btnNow) { loadCalendar(); return; }
        btnNow.disabled = false;
        btnNow.textContent = "נסה שוב";
        toast(`שגיאה: ${err.message}`, "error");
      }
    });
  }

  renderView();
}

function showBookModal({ date, time, typesMap }) {
  let selectedPatient = null;
  let selectedTypeId = "";
  let selectedTime = time;
  let editingPatient = false;
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
          <p style="margin: 0 0 0.75rem; color: var(--text-secondary); font-size: 0.9rem; display: flex; gap: 0.5rem; align-items: center">
            ${esc(date)} בשעה
            <input type="time" id="book-time" value="${attr(selectedTime)}" step="900" style="font-size: 0.9rem; padding: 0.2rem">
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
    document.getElementById("book-time").addEventListener("change", (e) => {
      if (e.target.value) selectedTime = e.target.value;
    });
    document.getElementById("book-yes").addEventListener("click", handleBookConfirm);

    renderPatientSection();
    updateBookEnabled();
  }

  function onPatientSelected(p) {
    selectedPatient = p;
    editingPatient = false;
    createMode = false;
    renderPatientSection();
    updateBookEnabled();
  }

  function renderPatientSection() {
    const sec = document.getElementById("book-patient-section");
    if (!sec) return;
    if (selectedPatient && editingPatient) return renderPatientPanelEdit(sec);
    if (selectedPatient)                    return renderPatientPanelView(sec);
    if (createMode)                         return renderPatientCreate(sec);
    return renderPatientSearch(sec);
  }

  function renderPatientPanelView(sec) {
    const p = selectedPatient;
    sec.innerHTML = `
      <div class="patient-panel">
        <div class="patient-header">
          <div class="patient-name">${esc(p.first_name)} ${esc(p.last_name)}</div>
          <div class="patient-actions">
            <button class="btn btn-secondary btn-sm" id="patient-edit">ערוך</button>
            <button class="btn btn-secondary btn-sm" id="patient-clear">החלף</button>
          </div>
        </div>
        <div class="patient-fields">
          <div><span class="muted">טלפון:</span> ${esc(p.phone || "—")}</div>
          <div><span class="muted">אימייל:</span> ${esc(p.email || "—")}</div>
          <div><span class="muted">ת״ז:</span> ${esc(p.id_number || "—")}</div>
          <div><span class="muted">תאריך לידה:</span> ${esc(formatDob(p.date_of_birth) || "—")}</div>
        </div>
      </div>`;
    document.getElementById("patient-edit").addEventListener("click", () => {
      editingPatient = true;
      renderPatientSection();
      updateBookEnabled();
    });
    document.getElementById("patient-clear").addEventListener("click", () => {
      selectedPatient = null;
      editingPatient = false;
      renderPatientSection();
      updateBookEnabled();
    });
  }

  function renderPatientPanelEdit(sec) {
    const p = selectedPatient;
    sec.innerHTML = `
      <div class="patient-panel">
        <div class="form-grid">
          <div class="form-group"><label>שם פרטי</label><input id="pe-first" value="${attr(p.first_name || "")}"></div>
          <div class="form-group"><label>שם משפחה</label><input id="pe-last" value="${attr(p.last_name || "")}"></div>
          <div class="form-group" style="grid-column:1/-1"><label>טלפון</label><input id="pe-phone" type="tel" value="${attr(p.phone || "")}"></div>
          <div class="form-group" style="grid-column:1/-1"><label>אימייל</label><input id="pe-email" type="email" value="${attr(p.email || "")}"></div>
          <div class="form-group"><label>ת״ז</label><input id="pe-id" value="${attr(p.id_number || "")}"></div>
          <div class="form-group"><label>תאריך לידה</label><input id="pe-dob" type="date" value="${attr(p.date_of_birth || "")}"></div>
        </div>
        <div class="form-error" id="pe-error" style="display:none"></div>
        <div class="form-actions">
          <button class="btn btn-primary btn-sm" id="pe-save">שמור</button>
          <button class="btn btn-secondary btn-sm" id="pe-cancel">ביטול</button>
        </div>
      </div>`;
    document.getElementById("pe-save").addEventListener("click", handlePatientSave);
    document.getElementById("pe-cancel").addEventListener("click", () => {
      editingPatient = false;
      renderPatientSection();
      updateBookEnabled();
    });
  }

  function renderPatientCreate(sec) {
    sec.innerHTML = `
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem">
        <div class="form-grid">
          <div class="form-group"><label>שם פרטי</label><input id="np-first" required></div>
          <div class="form-group"><label>שם משפחה</label><input id="np-last" required></div>
          <div class="form-group" style="grid-column:1/-1"><label>טלפון</label><input id="np-phone" type="tel" required></div>
          <div class="form-group" style="grid-column:1/-1"><label>אימייל (אופציונלי)</label><input id="np-email" type="email"></div>
          <div class="form-group"><label>ת״ז (אופציונלי)</label><input id="np-id"></div>
          <div class="form-group"><label>תאריך לידה (אופציונלי)</label><input id="np-dob" type="date"></div>
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
  }

  function renderPatientSearch(sec) {
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

  async function handlePatientSave() {
    const errEl = document.getElementById("pe-error");
    const showPeErr = (msg) => {
      if (!errEl) return;
      errEl.textContent = msg;
      errEl.style.display = msg ? "" : "none";
    };
    const payload = {
      first_name: document.getElementById("pe-first").value.trim(),
      last_name:  document.getElementById("pe-last").value.trim(),
      phone:      document.getElementById("pe-phone").value.trim(),
      email:      document.getElementById("pe-email").value.trim() || null,
      id_number:  document.getElementById("pe-id").value.trim() || null,
      date_of_birth: document.getElementById("pe-dob").value || null,
    };
    if (!payload.first_name || !payload.last_name || !payload.phone) {
      return showPeErr("שם פרטי, שם משפחה וטלפון חובה");
    }
    // Guard: warn if a previously-set optional field is being wiped.
    const wiped = [];
    const labels = { email: "אימייל", id_number: "ת״ז", date_of_birth: "תאריך לידה" };
    for (const k of ["email", "id_number", "date_of_birth"]) {
      if (selectedPatient[k] && !payload[k]) wiped.push(labels[k]);
    }
    if (wiped.length) {
      if (!window.confirm(`השדות הבאים יימחקו: ${wiped.join(", ")}. להמשיך?`)) return;
    }
    showPeErr("");
    const btn = document.getElementById("pe-save");
    btn.disabled = true; btn.textContent = "שומר...";
    try {
      const updated = await api.updatePatient(selectedPatient.id, payload);
      selectedPatient = updated;
      editingPatient = false;
      renderPatientSection();
      updateBookEnabled();
      toast("פרטי המטופל עודכנו", "success");
    } catch (err) {
      btn.disabled = false; btn.textContent = "שמור";
      showPeErr(err.message);
    }
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
          if (p) onPatientSelected(p);
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
        email: document.getElementById("np-email").value.trim() || null,
        id_number: document.getElementById("np-id").value.trim() || null,
        date_of_birth: document.getElementById("np-dob").value || null,
      });
      onPatientSelected(created);
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
    btn.disabled = !(selectedPatient && selectedTypeId && activeTypes.length) || editingPatient;
  }

  async function handleBookConfirm() {
    const btn = document.getElementById("book-yes");
    const errEl = document.getElementById("book-error");
    const showErr = (msg) => {
      if (!errEl) return;
      errEl.textContent = msg;
      errEl.style.display = msg ? "" : "none";
    };
    showErr("");
    btn.disabled = true;
    btn.textContent = "מתזמן...";

    // Phase 1: fetch live slots for this date+type to get a backend-format
    // start_time string. Sidesteps client-side TZ construction
    // (per .work/project_scheduling_slots_tz_bug.md — no TZ shims in the
    // dashboard) and gives concurrent-booking protection in the same call.
    let match;
    try {
      const slots = await fetchAvailableSlots({
        doctorId,
        date,
        appointmentTypeId: selectedTypeId,
      });
      match = slots.find((s) => slotTimeLabel(s.start_time) === selectedTime);
    } catch (err) {
      if (!document.getElementById("book-yes")) return; // modal closed mid-fetch
      btn.disabled = false;
      btn.textContent = "אישור";
      if (err.name === "TypeError") {
        showErr("שגיאת רשת בבדיקת זמינות — נסה שוב");
      } else {
        showErr(`שגיאה בבדיקת זמינות: ${err.message}`);
      }
      return;
    }

    if (!match) {
      if (!document.getElementById("book-yes")) return;
      btn.disabled = false;
      btn.textContent = "אישור";
      showErr("השעה כבר אינה זמינה — סגור ובחר שעה אחרת");
      return;
    }

    // Phase 2: book with the API-returned start_time string (TZ-aware).
    try {
      await api.bookAppointment({
        doctor_id: doctorId,
        patient_id: selectedPatient.id,
        appointment_type_id: selectedTypeId,
        start_time: match.start_time,
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
      if (!document.getElementById("book-yes")) return;
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
