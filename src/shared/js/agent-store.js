// shared/agent-store.js — Danh sách Đại lý (Admin > Đại lý > Thiết lập đại lý CRUD; ticketstaff đọc để chọn
// đại lý ở ô "Đại lý" khi đặt/bán vé). Lưu localStorage HN_AGENTS_KEY, shape: { id, code, name, phone, note }.
// Vé (seat) chỉ lưu seat.agentId + seat.agentName — tên chụp tại lúc đặt để thống kê không mất khi đại lý bị xoá.
// Nạp bằng <script> thường SAU storage-keys.js.
window.AgentStore = (function () {
  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(HN_AGENTS_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function write(list) { localStorage.setItem(HN_AGENTS_KEY, JSON.stringify(list)); }
  function nextCode(list) {
    const max = list.reduce((m, a) => Math.max(m, parseInt(String(a.code || '').replace(/\D/g, ''), 10) || 0), 0);
    return 'DL' + String(max + 1).padStart(3, '0');
  }
  function validate(list, fields, selfId) {
    if (!fields.name) return { ok: false, reason: 'Nhập tên đại lý.' };
    const dup = list.some(a => a.id !== selfId && a.name.trim().toLowerCase() === fields.name.toLowerCase());
    return dup ? { ok: false, reason: 'Tên đại lý đã tồn tại.' } : { ok: true };
  }
  function clean(fields) {
    return {
      name: String(fields.name || '').trim(),
      phone: String(fields.phone || '').trim(),
      note: String(fields.note || '').trim()
    };
  }
  return {
    getAll: read,
    getById: id => read().find(a => a.id === id) || null,
    add(fields) {
      const list = read();
      const f = clean(fields);
      const v = validate(list, f, null);
      if (!v.ok) return v;
      const item = Object.assign({ id: 'ag_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), code: nextCode(list) }, f);
      list.push(item);
      write(list);
      return { ok: true, item };
    },
    update(id, fields) {
      const list = read();
      const idx = list.findIndex(a => a.id === id);
      if (idx < 0) return { ok: false, reason: 'Không tìm thấy đại lý.' };
      const f = clean(fields);
      const v = validate(list, f, id);
      if (!v.ok) return v;
      list[idx] = Object.assign({}, list[idx], f);
      write(list);
      return { ok: true, item: list[idx] };
    },
    remove(id) {
      write(read().filter(a => a.id !== id));
      return { ok: true };
    }
  };
})();
