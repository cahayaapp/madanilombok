import { escapeHtml, formatDate, formatDateTime, toast } from "../utils.js";
import { byId } from "../app-store.js";

export const rupiah = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
export const today = () => new Date().toISOString().slice(0,10);

export function pageHeader(title, subtitle = "", actions = "") {
  return `<div class="section-head portal-section-head"><div><p class="eyebrow">MadaniApp</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><div class="section-actions">${actions}</div></div>`;
}

export function empty(message = "Belum ada data.") {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

export function panel(title, body, extraClass = "") {
  return `<section class="panel ${extraClass}"><div class="panel-head"><h3>${escapeHtml(title)}</h3></div>${body}</section>`;
}

export function badge(text, tone = "") {
  return `<span class="badge ${tone}">${escapeHtml(text ?? "—")}</span>`;
}

export function metric(label, value, detail = "", tone = "blue") {
  return `<div class="portal-metric ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div>`;
}

export function selectOptions(rows, selected = "", labelKey = "name", emptyLabel = "Pilih...") {
  return `<option value="">${escapeHtml(emptyLabel)}</option>` + rows.map(row => `<option value="${escapeHtml(row.id)}" ${String(row.id) === String(selected) ? "selected" : ""}>${escapeHtml(row[labelKey] || row.id)}</option>`).join("");
}

export function studentOptions(students, selected = "") {
  return `<option value="">Pilih santri...</option>` + students.map(s => `<option value="${escapeHtml(s.id)}" ${s.id===selected?"selected":""}>${escapeHtml(s.name)}${s.studentNo ? ` · ${escapeHtml(s.studentNo)}` : ""}</option>`).join("");
}

export function table(headers, rowsHtml, minWidth = 760) {
  return `<div class="table-card"><div class="table-scroll"><table class="data-table" style="min-width:${minWidth}px"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rowsHtml || `<tr><td colspan="${headers.length}" class="muted">Belum ada data.</td></tr>`}</tbody></table></div></div>`;
}

export function formRow(label, control, full = false) {
  return `<label class="field ${full ? "full" : ""}"><span>${escapeHtml(label)}</span>${control}</label>`;
}

export function input(name, value = "", type = "text", extra = "") {
  return `<input name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value ?? "")}" ${extra}>`;
}

export function textarea(name, value = "", extra = "") {
  return `<textarea name="${escapeHtml(name)}" ${extra}>${escapeHtml(value ?? "")}</textarea>`;
}

export function select(name, optionsHtml, extra = "") {
  return `<select name="${escapeHtml(name)}" ${extra}>${optionsHtml}</select>`;
}

export function statusOptions(selected = "") {
  return ["Hadir","Terlambat","Sakit","Izin","Alfa"].map(v => `<option value="${v}" ${v===selected?"selected":""}>${v}</option>`).join("");
}

export function serializeForm(form) {
  const fd = new FormData(form);
  return Object.fromEntries(fd.entries());
}

export function attachAsync(form, handler, successMessage = "Data tersimpan.") {
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const submit = form.querySelector("button[type=submit],button:not([type]),input[type=submit]");
    if (submit) submit.disabled = true;
    try {
      await handler(serializeForm(form), form);
      toast(successMessage);
    } catch (err) {
      console.error(err);
      toast(err.message || "Gagal menyimpan data.", "error");
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

export function resolveStudent(studentId, master) {
  return byId(master.students || [])[studentId] || null;
}

export function resolveClass(classId, master) {
  return byId(master.classes || [])[classId] || null;
}

export function resolveSubject(subjectId, master) {
  return byId(master.subjects || [])[subjectId] || null;
}

export { escapeHtml, formatDate, formatDateTime, toast };
