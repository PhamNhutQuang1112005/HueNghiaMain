/* =========================================================
   AUTH/AUTH-LOG.JS — Phiên, thiết bị, sự kiện đăng nhập, duyệt đăng nhập (bản demo, localStorage).
   =========================================================

   Ghi lại những gì Nhật ký đăng nhập (Admin > Hệ thống > Nhật ký hoạt động) và trang Tài khoản cần hiển thị:
     user_sessions ... mỗi lần đăng nhập thành công một phiên (giờ vào, giờ ra, lý do kết thúc, thiết bị)
     user_devices .... sổ thiết bị: mỗi trình duyệt có 1 mã thiết bị ngẫu nhiên (HN_DEVICE_TOKEN_KEY)
     auth_events ..... login_ok, login_failed, login_blocked, logout, session_expired, session_revoked, ...
     login_approvals / login_exceptions ... chỉ ĐỌC/GHI từ trang Admin (demo chưa chặn đăng nhập theo duyệt/lịch ca)

   Quy tắc đang chạy ở bản demo: MỘT PHIÊN MỘT THIẾT BỊ (đăng nhập mới đá phiên cũ: device_replaced), phiên hết hạn
   tuyệt đối 12 giờ, phiên không hoạt động quá idle_timeout_minutes bị đánh dấu idle_timeout, khóa nhập sai (5 lần
   login_failed trong 15 phút kể từ lần account_unlocked gần nhất). CỔNG LỊCH CA và BƯỚC DUYỆT ĐĂNG NHẬP chưa chặn ở
   bản demo (chờ backend) — dữ liệu và giao diện của chúng đã sẵn ở Admin.

   Khi lên thật: toàn bộ file này thay bằng API server (mã thiết bị lưu cookie httpOnly, token phiên băm SHA-256...).
   Nạp bằng <script> thường SAU storage-keys.js. API: window.AuthLog
   ========================================================= */
(function () {
  'use strict';

  var DEFAULTS = {
    idleTimeoutMinutes: 60,        // idle_timeout_minutes
    sessionHours: 12,              // hết hạn tuyệt đối
    failedLoginLimit: 5,
    failedLoginWindowMinutes: 15,
    logRetentionMonths: 12,        // log_retention_months
    earlyLoginMinutes: 15,         // early_login_minutes
    lateGraceMinutes: 0,           // late_grace_minutes
    approvalValidMinutes: 10,      // approval_valid_minutes
    approvalRejectCooldownMinutes: 5,
    maxPendingApprovalsPerUser: 3,
    scheduleTimezone: 'Asia/Ho_Chi_Minh'
  };
  var EVENT_CAP = 3000;

  function read(key, fb) {
    try { var raw = localStorage.getItem(key); if (raw === null) return fb; var v = JSON.parse(raw); return v == null ? fb : v; }
    catch (e) { return fb; }
  }
  function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* quota */ } }
  function rid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function settings() {
    var s = read(HN_APP_SETTINGS_HR_KEY, {});
    var o = {};
    Object.keys(DEFAULTS).forEach(function (k) { o[k] = s && s[k] != null ? s[k] : DEFAULTS[k]; });
    return o;
  }
  function saveSettings(patch) {
    var cur = read(HN_APP_SETTINGS_HR_KEY, {});
    write(HN_APP_SETTINGS_HR_KEY, Object.assign({}, cur, patch));
  }

  /* ---- Thiết bị ---- */
  function deviceToken() {
    var t = null;
    try { t = localStorage.getItem(HN_DEVICE_TOKEN_KEY); } catch (e) { /* ignore */ }
    if (!t) {
      var arr = new Uint8Array(16);
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(arr);
      else for (var i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      t = Array.prototype.map.call(arr, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      try { localStorage.setItem(HN_DEVICE_TOKEN_KEY, t); } catch (e) { /* ignore */ }
    }
    return t;
  }
  function describeBrowser() {
    var ua = navigator.userAgent || '';
    var os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Thiết bị khác';
    var br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Trình duyệt';
    var platform = /Android/.test(ua) ? 'android' : /iPhone|iPad|iOS/.test(ua) ? 'ios' : 'web';
    return { label: br + ' trên ' + os, platform: platform, userAgent: ua };
  }
  function getDevices() { return read(HN_AUTH_DEVICES_KEY, []); }
  function saveDevices(a) { write(HN_AUTH_DEVICES_KEY, a); }
  // Tìm hoặc tạo dòng sổ thiết bị cho (username, mã thiết bị của trình duyệt này).
  function ensureDevice(username) {
    var tok = deviceToken();
    var list = getDevices();
    var d = list.find(function (x) { return x.username === username && x.token === tok; });
    var now = Date.now();
    if (!d) {
      var b = describeBrowser();
      d = { id: rid('dev_'), username: username, token: tok, label: b.label, platform: b.platform, userAgent: b.userAgent,
            firstSeenAt: now, lastSeenAt: now, status: 'active', blockedBy: '', blockedAt: 0, blockNote: '' };
      list.push(d);
      saveDevices(list);
    }
    return d;
  }
  function touchDevice(id) {
    var list = getDevices();
    var d = list.find(function (x) { return x.id === id; });
    if (d) { d.lastSeenAt = Date.now(); saveDevices(list); }
  }

  /* ---- Sự kiện (auth_events) ---- */
  function getEvents() { return read(HN_AUTH_EVENTS_KEY, []); }
  function event(eventType, o) {
    o = o || {};
    var list = getEvents();
    list.push({ id: rid('ev_'), ts: Date.now(), username: o.username || '', eventType: eventType,
                sessionId: o.sessionId || '', deviceId: o.deviceId || '', detail: o.detail || {} });
    if (list.length > EVENT_CAP) list = list.slice(list.length - EVENT_CAP);
    write(HN_AUTH_EVENTS_KEY, list);
  }

  /* ---- Phiên (user_sessions) ---- */
  function getSessions() { return read(HN_AUTH_SESSIONS_KEY, []); }
  function saveSessions(a) { write(HN_AUTH_SESSIONS_KEY, a); }

  // Đánh dấu phiên quá hạn (revokedAt = expiresAt) hoặc không hoạt động (revokedAt = lastSeenAt). Chạy mỗi lần mở trang.
  function sweep() {
    var st = settings(), now = Date.now(), list = getSessions(), changed = false;
    list.forEach(function (s) {
      if (s.revokedAt) return;
      if (s.expiresAt && now > s.expiresAt) {
        s.revokedAt = s.expiresAt; s.revokeReason = 'expired'; changed = true;
        event('session_expired', { username: s.username, sessionId: s.id, deviceId: s.deviceId, detail: { reason: 'expired' } });
      } else if (now - (s.lastSeenAt || s.createdAt) > st.idleTimeoutMinutes * 60000) {
        s.revokedAt = s.lastSeenAt || s.createdAt; s.revokeReason = 'idle_timeout'; changed = true;
        event('session_expired', { username: s.username, sessionId: s.id, deviceId: s.deviceId, detail: { reason: 'idle_timeout' } });
      }
    });
    if (changed) saveSessions(list);
  }

  function liveSession(username) {
    return getSessions().find(function (s) { return s.username === username && !s.revokedAt; }) || null;
  }

  // Thu hồi phiên: id (1 phiên) — reason theo CHECK user_sessions.revoke_reason. by = username người thu hồi (nếu admin).
  function revokeSession(id, reason, by) {
    var list = getSessions(), s = list.find(function (x) { return x.id === id; });
    if (!s || s.revokedAt) return false;
    s.revokedAt = Date.now(); s.revokeReason = reason;
    saveSessions(list);
    var evType = (reason === 'logout' || reason === 'logout_all') ? reason : (reason === 'expired' || reason === 'idle_timeout') ? 'session_expired' : 'session_revoked';
    event(evType, { username: s.username, sessionId: s.id, deviceId: s.deviceId, detail: { reason: reason, by: by || '' } });
    return true;
  }
  function revokeAllOf(username, reason, by) {
    var n = 0;
    getSessions().forEach(function (s) { if (s.username === username && !s.revokedAt && revokeSession(s.id, reason, by)) n++; });
    return n;
  }

  // Cấp phiên mới sau khi đăng nhập thành công: đá mọi phiên còn sống của tài khoản (device_replaced).
  function startSession(username, detail) {
    var dev = ensureDevice(username);
    touchDevice(dev.id);
    revokeAllOf(username, 'device_replaced', '');
    var st = settings(), now = Date.now();
    var s = { id: rid('ses_'), username: username, deviceId: dev.id, createdAt: now, lastSeenAt: now,
              expiresAt: now + st.sessionHours * 3600000, revokedAt: 0, revokeReason: '', ip: '', userAgent: navigator.userAgent || '' };
    var list = getSessions(); list.push(s); saveSessions(list);
    event('login_ok', { username: username, sessionId: s.id, deviceId: dev.id, detail: detail || {} });
    // Cập nhật lần đăng nhập cuối trên tài khoản.
    try {
      var accs = read(HN_ADMIN_ACCOUNTS_KEY, []);
      var a = accs.find(function (x) { return x.username === username; });
      if (a) { a.lastLoginAt = now; write(HN_ADMIN_ACCOUNTS_KEY, accs); }
    } catch (e) { /* ignore */ }
    return s;
  }

  function currentSid() {
    try { var u = JSON.parse(sessionStorage.getItem(HN_CURRENT_USER_KEY) || 'null'); return (u && u.sid) || ''; } catch (e) { return ''; }
  }
  // Mỗi lần dùng phiên: cập nhật last_seen_at tối đa 1 lần/phút.
  function touch() {
    var sid = currentSid(); if (!sid) return;
    var list = getSessions(), s = list.find(function (x) { return x.id === sid; });
    if (!s || s.revokedAt) return;
    var now = Date.now();
    if (now - (s.lastSeenAt || 0) < 60000) return;
    s.lastSeenAt = now; saveSessions(list);
  }
  function onLogout() {
    var sid = currentSid(); if (!sid) return;
    revokeSession(sid, 'logout', '');
  }
  // Phiên của trình duyệt này đã bị thu hồi từ nơi khác (admin thu hồi, bị đá, hết hạn)? Trả lý do hoặc ''.
  function currentSessionRevoked() {
    var sid = currentSid(); if (!sid) return '';
    var s = getSessions().find(function (x) { return x.id === sid; });
    return s && s.revokedAt ? (s.revokeReason || 'revoked') : '';
  }

  /* ---- Khóa nhập sai: 5 login_failed trong 15 phút kể từ lần account_unlocked gần nhất ---- */
  function failedLoginCount(username) {
    var st = settings(), since = Date.now() - st.failedLoginWindowMinutes * 60000;
    var lastUnlock = 0;
    var evs = getEvents().filter(function (e) { return e.username === username; });
    evs.forEach(function (e) { if (e.eventType === 'account_unlocked' && e.ts > lastUnlock) lastUnlock = e.ts; });
    return evs.filter(function (e) { return e.eventType === 'login_failed' && e.ts >= since && e.ts > lastUnlock; }).length;
  }
  function isFailedLoginLocked(username) { return failedLoginCount(username) >= settings().failedLoginLimit; }

  /* ---- Duyệt đăng nhập & ngoại lệ (đọc cho trang Admin) ---- */
  function getApprovals() { return read(HN_LOGIN_APPROVALS_KEY, []); }
  function saveApprovals(a) { write(HN_LOGIN_APPROVALS_KEY, a); }
  function getExceptions() { return read(HN_LOGIN_EXCEPTIONS_KEY, []); }
  function saveExceptions(a) { write(HN_LOGIN_EXCEPTIONS_KEY, a); }
  function activeException(username) {
    var now = Date.now();
    return getExceptions().find(function (x) {
      return x.username === username && !x.revokedAt && x.validFrom <= now && now < x.validUntil;
    }) || null;
  }

  try { sweep(); } catch (e) { /* ignore */ }

  window.AuthLog = {
    DEFAULTS: DEFAULTS,
    settings: settings, saveSettings: saveSettings,
    deviceToken: deviceToken, ensureDevice: ensureDevice, getDevices: getDevices, saveDevices: saveDevices,
    event: event, getEvents: getEvents,
    getSessions: getSessions, saveSessions: saveSessions, sweep: sweep, liveSession: liveSession,
    startSession: startSession, revokeSession: revokeSession, revokeAllOf: revokeAllOf,
    touch: touch, onLogout: onLogout, currentSessionRevoked: currentSessionRevoked,
    failedLoginCount: failedLoginCount, isFailedLoginLocked: isFailedLoginLocked,
    getApprovals: getApprovals, saveApprovals: saveApprovals,
    getExceptions: getExceptions, saveExceptions: saveExceptions, activeException: activeException,
    newId: rid
  };
})();
