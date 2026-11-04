/* =========================================================
   NHÂN SỰ — HÀM DÙNG CHUNG (HR v3.1) cho Cấu hình nhân sự, Quản lý nhân viên, Tài khoản, Thống kê nhân sự, Nhật ký.
   Nạp TRƯỚC admin-staff.js. Mọi hàm đặt tên hr*.

   Chuỗi quyền:   tài khoản -> nhân viên -> loại nhân viên -> quyền của loại. Quyền KHÔNG gán riêng từng người.
   Phạm vi xem:   TRẠM ĐƯỢC XEM = trạm gán lẻ (staff.stations) HỢP trạm active của khu vực được gán (staff.regions).
                  Admin gốc hoặc người có quyền view_all_stations: mọi trạm active. Nhóm tự xem (tài xế, tài xế trung chuyển,
                  phụ xe — theo cờ is_self của loại, KHÔNG theo mã loại): chỉ dữ liệu của chính mình.
   Trạm lưu bằng TÊN (khớp quy ước FleetStore.getStations()), khu vực lưu bằng KEY (getRegionMeta()).
   ========================================================= */

/* ---- Người thao tác hiện tại ---- */
function hrActor() {
  var u = (window.Session && Session.get()) || null;
  return { username: (u && u.username) || '', isRoot: !!(u && u.role === 'admin') };
}
function hrIsRootAccount(acc) { return !!acc && acc.role === 'admin'; }

/* ---- Loại nhân viên, quyền, ba cờ (is_self, requires_license, crew_role) ---- */
function hrRole(key) { return FleetStore.getStaffRoles().find(function (r) { return r.key === key; }) || null; }
function hrRoleLabel(key) { var r = hrRole(key); return r ? r.label : (key === 'admin' ? 'Quản trị gốc' : (key || '—')); }
var HR_CREW_ROLES = [['', 'Không'], ['route_driver', 'Tài xế tuyến'], ['shuttle_driver', 'Tài xế trung chuyển'], ['helper', 'Phụ xe']];
function hrCrewRole(roleKey) { var r = hrRole(roleKey); return r ? (r.crewRole || '') : ''; }
function hrCrewRoleLabel(c) { var m = HR_CREW_ROLES.find(function (x) { return x[0] === (c || ''); }); return m ? m[1] : (c || '—'); }
function hrIsSelfKind(roleKey) { var r = hrRole(roleKey); return !!(r && r.isSelf); }
function hrNeedsLicense(roleKey) { var r = hrRole(roleKey); return !!(r && r.requiresLicense); }
function hrRolePerms(roleKey) { var r = hrRole(roleKey); return r ? r.permissions : []; }
function hrRoleHas(roleKey, perm) { return hrRolePerms(roleKey).indexOf(perm) !== -1; }
// NHÓM ĐƯỢC BẢO VỆ: loại chứa quyền protects_holder (manage_hr, manage_accounts). Bỏ qua trạng thái, tài khoản, must_change_password.
function hrIsProtectedRole(roleKey) {
  return hrRolePerms(roleKey).some(function (p) { var i = window.permInfo(p); return i && i.protects; });
}
function hrIsProtectedStaff(s) { return !!s && (s.role === 'admin' || hrIsProtectedRole(s.role)); }

/* ---- Trạng thái làm việc ---- */
function hrStatusName(code) { var s = FleetStore.employmentStatus(code); return s ? s.name : (code || '—'); }
function hrStatusLocks(code) { var s = FleetStore.employmentStatus(code); return !!(s && s.locksAccount); }
function hrStaffStatus(s) { return (s && s.statusCode) || (s && s.active === false ? 'suspended' : 'working'); }

/* ---- Khu vực, trạm ---- */
function hrRegionKeys() { return getRegionMeta().map(function (m) { return m[0]; }); }
function hrRegionName(key) { var m = getRegionMeta({ all: true }).find(function (x) { return x[0] === key; }); return m ? m[1] : (key || ''); }
function hrActiveStations() { return FleetStore.getStations().filter(function (st) { return st && st.active !== false; }); }
function hrStationsOfRegion(key) { return hrActiveStations().filter(function (st) { return st.region === key; }); }
function hrStationRegionKey(name) { var st = FleetStore.getStations().find(function (x) { return x.name === name; }); return st ? (st.region || '') : ''; }

// Phạm vi xem của một nhân viên: { viewAll, names[] }.
function hrScope(s) {
  if (!s) return { viewAll: false, names: [], self: false };
  if (s.role === 'admin' || hrRoleHas(s.role, 'view_all_stations')) {
    return { viewAll: true, names: hrActiveStations().map(function (x) { return x.name; }), self: false };
  }
  var names = (s.stations || []).slice();
  if (hrIsSelfKind(s.role)) return { viewAll: false, names: names, self: true };
  (s.regions || []).forEach(function (rk) {
    hrStationsOfRegion(rk).forEach(function (st) { if (names.indexOf(st.name) === -1) names.push(st.name); });
  });
  return { viewAll: false, names: names, self: false };
}

/* ---- Tài khoản <-> nhân viên ---- */
function hrStaffOfAccount(acc) {
  if (!acc || hrIsRootAccount(acc)) return null;
  var all = FleetStore.getStaff();
  if (acc.employeeId) { var byId = all.find(function (s) { return s.id === acc.employeeId; }); if (byId) return byId; }
  return all.find(function (s) { return s.username && s.username === acc.username && s.role !== 'admin'; }) || null;
}
function hrAccountOfStaff(s) {
  if (!s) return null;
  var list = getAccountsList();
  return list.find(function (a) { return a.employeeId && a.employeeId === s.id; }) ||
    list.find(function (a) { return s.username && a.username === s.username; }) || null;
}

/* ---- Quy tắc "AI SỬA AI" (b, c, e) ---- */
// Trả { ok, reason }. target là bản ghi nhân viên (null = nhân viên mới). Người không phải admin gốc cần quyền manage_hr.
function hrCanEditStaff(target) {
  var actor = hrActor();
  if (actor.isRoot) return { ok: true, reason: '' };
  if (!acHasPerm('manage_hr')) return { ok: false, reason: 'Bạn không có quyền Quản lý nhân sự.' };
  var actorStaff = FleetStore.getStaff().find(function (s) { return s.username === actor.username; });
  if (actorStaff && target && actorStaff.id === target.id) return { ok: false, reason: 'Không ai tự sửa chính mình (kể cả HR). Nhờ admin gốc hoặc người khác thực hiện.' };
  if (hrIsProtectedStaff(target)) return { ok: false, reason: 'Hồ sơ này thuộc nhóm được bảo vệ (HR/admin) — chỉ admin gốc sửa được.' };
  return { ok: true, reason: '' };
}
// Quyền người thao tác (không phải admin gốc) được CẤP cho người khác = grantable của loại của họ.
function hrActorGrantable() {
  var actor = hrActor();
  var actorStaff = FleetStore.getStaff().find(function (s) { return s.username === actor.username; });
  return (actorStaff && hrRole(actorStaff.role) && hrRole(actorStaff.role).grantable) || [];
}
// Trần ủy quyền: quyền được THÊM (quyền loại mới trừ loại cũ) phải nằm trong grantable của loại người thao tác.
function hrCheckGrantCeiling(oldRoleKey, newRoleKey) {
  var actor = hrActor();
  if (actor.isRoot) return { ok: true, missing: [] };
  var grantable = hrActorGrantable();
  var oldP = oldRoleKey ? hrRolePerms(oldRoleKey) : [];
  var added = hrRolePerms(newRoleKey).filter(function (p) { return oldP.indexOf(p) === -1; });
  var missing = added.filter(function (p) { return grantable.indexOf(p) === -1; });
  return { ok: !missing.length, missing: missing };
}
function hrPermLabels(keys) {
  return keys.map(function (k) { var i = window.permInfo(k); return i ? i.label : k; }).join(', ');
}

/* ---- Định dạng ---- */
function hrFmtDateTime(ts) { return ts ? fmtStamp(ts) : '—'; }
function hrFmtDate(ts) {
  if (!ts) return '—';
  if (typeof ts === 'string') return fmtDate(ts);
  var d = new Date(ts); if (isNaN(d)) return '—';
  var p = function (x) { return String(x).padStart(2, '0'); };
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
}
function hrDurationText(fromTs, toTs) {
  if (!fromTs) return '—';
  var ms = Math.max(0, (toTs || Date.now()) - fromTs), m = Math.floor(ms / 60000);
  var h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d >= 1) return d + ' ngày ' + (h % 24) + ' giờ';
  if (h >= 1) return h + ' giờ ' + (m % 60) + ' phút';
  return m + ' phút';
}
function hrBadge(text, cls) {
  return '<span class="status-badge ' + (cls || 'chua-chi-dinh') + '"><span class="status-dot"></span>' + esc(text) + '</span>';
}
function hrChip(text, tone) {
  var tones = { red: 'background:var(--red-light);color:var(--red);', green: 'background:#ECFDF5;color:#047857;', amber: 'background:#FEF3C7;color:#B45309;', gray: 'background:#F1F5F9;color:#475569;', blue: 'background:#E0F2FE;color:#0369A1;' };
  return '<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:700;' + (tones[tone] || tones.gray) + '">' + esc(text) + '</span>';
}
function hrWarnHtml(list) {
  if (!list || !list.length) return '<span class="hint-inline">—</span>';
  return list.map(function (w) { return '<div class="hr-warn">' + esc(w) + '</div>'; }).join('');
}

/* ---- So sánh cũ/mới thành activity_logs.changes ---- */
function hrDiff(before, after, keys) {
  var out = {}, any = false;
  keys.forEach(function (k) {
    var a = before ? before[k] : undefined, b = after ? after[k] : undefined;
    if (JSON.stringify(a == null ? '' : a) !== JSON.stringify(b == null ? '' : b)) { out[k] = { old: a == null ? null : a, new: b == null ? null : b }; any = true; }
  });
  return any ? out : null;
}
// Ghi activity_logs: entity = TÊN BẢNG bị tác động (employees, users, employee_types...).
function hrLog(action, entity, entityId, summary, changes, reason) {
  var ch = changes || {};
  if (reason) ch = Object.assign({ reason: reason }, ch);
  FleetStore.log({ action: action, entity: entity, entityId: entityId, summary: summary, changes: Object.keys(ch).length ? ch : undefined });
}

/* ---- Danh sách tick nhiều mục (trạm, khu vực, thứ trong tuần...) ----
   items: [{ value, label, checked, sub }]. Đọc lại bằng hrReadChecks(id). */
function hrCheckListHtml(id, items, emptyText) {
  if (!items.length) return '<div class="hint-inline" id="' + id + '">' + esc(emptyText || 'Không có mục nào.') + '</div>';
  return '<div class="hr-checklist" id="' + id + '">' + items.map(function (it) {
    return '<label class="hr-check">' +
      '<input type="checkbox" value="' + esc(it.value) + '"' + (it.checked ? ' checked' : '') + (it.attrs ? ' ' + it.attrs : '') + '>' +
      '<span>' + esc(it.label) + (it.sub ? ' <em>' + esc(it.sub) + '</em>' : '') + '</span>' +
    '</label>';
  }).join('') + '</div>';
}
function hrReadChecks(id) {
  var box = document.getElementById(id);
  if (!box) return [];
  return Array.prototype.map.call(box.querySelectorAll('input[type="checkbox"]:checked'), function (c) { return c.value; });
}
/* Bảng hai nhóm thẻ nhỏ cho form: tiêu đề + nội dung. */
function hrSectionHtml(title, inner, hint) {
  return '<div class="hr-section"><div class="hr-section-head">' + esc(title) + (hint ? '<span>' + esc(hint) + '</span>' : '') + '</div>' + inner + '</div>';
}
function hrReadonlyField(label, valueHtml) {
  return '<div class="fld"><label>' + esc(label) + '</label><div class="hr-readonly">' + valueHtml + '</div></div>';
}
