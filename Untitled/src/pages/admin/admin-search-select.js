/* =========================================================
   ĐỔI TẤT CẢ <select> BÊN ADMIN THÀNH "SEARCH DROPDOWN" — gõ để lọc danh sách rồi chọn, thay vì bấm mở
   <select> gốc của trình duyệt. 66+ <select> rải khắp 15 file admin-*.js — thay vì sửa tay từng chỗ,
   file này tự động "khoác" thêm lớp input tìm kiếm lên MỌI <select> render ra trong #adminMain và
   #adminModalBox (kể cả render lại từ đầu qua innerHTML, kể cả trong modal), qua MutationObserver.

   Cách làm: ẩn <select> gốc (display:none) NHƯNG giữ nguyên trong DOM — mọi code cũ đọc/ghi $('id').value,
   data-change-action, required, disabled... vẫn chạy y nguyên, không phải sửa 1 dòng nào ở 15 file kia.
   Chỉ chèn thêm 1 <input> hiển thị + 1 dropdown gợi ý ngay cạnh, đồng bộ 2 chiều với select gốc:
     - Chọn 1 dòng trong dropdown -> gán select.value rồi bắn 'change' thật (bubbles) trên chính select
       -> data-change-action/onchange cũ tự chạy như khi người dùng chọn <select> thật.
     - Nơi khác gán select.value = x bằng JS (không qua UI này) -> override setter .value NGAY TRÊN
       INSTANCE (không đụng prototype chung) để tự đồng bộ lại chữ hiển thị.
     - <select> bị đổ lại <option> (disable/enable, đổi option...) -> MutationObserver riêng trên từng
       select đồng bộ lại hiển thị.
   Đọc danh sách option LIVE mỗi lần mở dropdown (không cache) nên các trường hợp code cũ tự đổ lại
   option cho 1 <select> đang tồn tại (không render lại cả khối) vẫn luôn ra đúng danh sách mới nhất.
   ========================================================= */
(function () {
  'use strict';

  var ENHANCED_PROP = '__adminSsEnhanced';

  function optionEntries(selectEl) {
    return Array.prototype.map.call(selectEl.querySelectorAll('option'), function (o) {
      return { value: o.value, label: o.textContent, disabled: !!o.disabled };
    });
  }

  function currentLabel(selectEl) {
    var opt = selectEl.options[selectEl.selectedIndex];
    return opt ? opt.textContent : '';
  }

  function escText(s) {
    return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s);
  }

  function enhanceSelect(selectEl) {
    if (!selectEl || selectEl.tagName !== 'SELECT' || selectEl[ENHANCED_PROP] || selectEl.multiple) return;
    selectEl[ENHANCED_PROP] = true;

    var wrap = document.createElement('span');
    wrap.className = 'admin-ss-wrap';
    if (selectEl.hasAttribute('style')) wrap.setAttribute('style', selectEl.getAttribute('style'));
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);
    selectEl.classList.add('admin-ss-native');

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'admin-ss-input';
    input.setAttribute('autocomplete', 'off');
    wrap.appendChild(input);

    function syncDisplay() {
      input.value = currentLabel(selectEl);
      input.disabled = selectEl.disabled;
      input.classList.toggle('admin-ss-disabled', selectEl.disabled);
    }
    syncDisplay();

    // Bắt gán select.value = x bằng JS ở nơi khác (không qua UI này) để tự cập nhật lại chữ hiển thị.
    try {
      var proto = Object.getPrototypeOf(selectEl);
      var desc = Object.getOwnPropertyDescriptor(proto, 'value') || Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (desc && desc.get && desc.set) {
        Object.defineProperty(selectEl, 'value', {
          configurable: true,
          get: function () { return desc.get.call(selectEl); },
          set: function (v) { desc.set.call(selectEl, v); syncDisplay(); }
        });
      }
    } catch (e) { /* trình duyệt không cho override -> vẫn còn syncDisplay() lúc mở dropdown/blur */ }

    var dropdownEl = null;
    var currentOptions = [];
    var highlightedIndex = -1;

    function ensureDropdown() {
      if (dropdownEl) return dropdownEl;
      dropdownEl = document.createElement('div');
      dropdownEl.className = 'admin-ss-dropdown';
      document.body.appendChild(dropdownEl);
      return dropdownEl;
    }
    function isOpen() { return !!dropdownEl && dropdownEl.classList.contains('open'); }
    function positionDropdown() {
      if (!dropdownEl) return;
      var r = input.getBoundingClientRect();
      var spaceBelow = window.innerHeight - r.bottom - 12;
      var openUp = spaceBelow < 140 && r.top > spaceBelow;
      dropdownEl.style.left = r.left + 'px';
      dropdownEl.style.width = r.width + 'px';
      if (openUp) {
        dropdownEl.style.top = '';
        dropdownEl.style.bottom = (window.innerHeight - r.top + 4) + 'px';
        dropdownEl.style.maxHeight = Math.max(120, r.top - 12) + 'px';
      } else {
        dropdownEl.style.bottom = '';
        dropdownEl.style.top = (r.bottom + 4) + 'px';
        dropdownEl.style.maxHeight = Math.max(120, spaceBelow) + 'px';
      }
    }
    function renderOptions(list) {
      var dd = ensureDropdown();
      currentOptions = list;
      highlightedIndex = -1;
      dd.innerHTML = list.length
        ? list.map(function (o, i) {
            return '<div class="admin-ss-option' + (o.disabled ? ' admin-ss-option-disabled' : '') + '" data-index="' + i + '">' + (escText(o.label).trim() ? escText(o.label) : '&nbsp;') + '</div>';
          }).join('')
        : '<div class="admin-ss-empty">Không tìm thấy</div>';
    }
    function openDropdown(filterText) {
      if (selectEl.disabled) return;
      var all = optionEntries(selectEl);
      var q = (filterText || '').trim().toLowerCase();
      var filtered = q ? all.filter(function (o) { return (o.label || '').toLowerCase().indexOf(q) !== -1; }) : all;
      renderOptions(filtered);
      positionDropdown();
      ensureDropdown().classList.add('open');
    }
    function closeDropdown(revert) {
      if (dropdownEl) dropdownEl.classList.remove('open');
      highlightedIndex = -1;
      if (revert) syncDisplay();
    }
    function updateHighlight() {
      if (!dropdownEl) return;
      Array.prototype.forEach.call(dropdownEl.querySelectorAll('.admin-ss-option'), function (el, i) {
        var active = i === highlightedIndex;
        el.classList.toggle('highlighted', active);
        if (active) el.scrollIntoView({ block: 'nearest' });
      });
    }
    function selectOption(opt) {
      if (!opt || opt.disabled) return;
      selectEl.value = opt.value; // qua setter override ở trên -> tự syncDisplay()
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      closeDropdown(false);
      input.blur();
    }

    input.addEventListener('focus', function () { input.select(); openDropdown(''); });
    input.addEventListener('click', function () { if (!isOpen()) { input.select(); openDropdown(''); } });
    input.addEventListener('input', function () { openDropdown(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen()) { openDropdown(input.value); return; }
        if (currentOptions.length) { highlightedIndex = (highlightedIndex + 1) % currentOptions.length; updateHighlight(); }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen()) { openDropdown(input.value); return; }
        if (currentOptions.length) { highlightedIndex = (highlightedIndex - 1 + currentOptions.length) % currentOptions.length; updateHighlight(); }
      } else if (e.key === 'Enter') {
        // input thường (không phải select) bấm Enter trong <form> sẽ tự submit — chặn luôn, chỉ chọn
        // dòng đang tô sáng nếu dropdown đang mở.
        e.preventDefault();
        if (isOpen() && highlightedIndex >= 0 && currentOptions[highlightedIndex]) {
          selectOption(currentOptions[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        if (isOpen()) { e.preventDefault(); closeDropdown(true); }
      } else if (e.key === 'Tab') {
        closeDropdown(true);
      }
    });
    input.addEventListener('blur', function () {
      // Đóng SAU khi mousedown chọn option đã xử lý xong (mousedown chạy trước blur).
      setTimeout(function () { if (isOpen()) closeDropdown(true); else syncDisplay(); }, 0);
    });
    document.addEventListener('mousedown', function (e) {
      var optionEl = e.target.closest('.admin-ss-option');
      if (optionEl && dropdownEl && dropdownEl.contains(optionEl)) {
        e.preventDefault();
        var idx = parseInt(optionEl.getAttribute('data-index'), 10);
        selectOption(currentOptions[idx]);
        return;
      }
      if (e.target === input) return;
      if (isOpen() && dropdownEl && !dropdownEl.contains(e.target)) closeDropdown(true);
    });
    window.addEventListener('scroll', function () { if (isOpen()) positionDropdown(); }, true);
    window.addEventListener('resize', function () { if (isOpen()) positionDropdown(); });

    // disabled đổi động (setAttribute hoặc .disabled = true đều phản ánh ra attribute) -> đồng bộ lại.
    new MutationObserver(syncDisplay).observe(selectEl, { attributes: true, attributeFilter: ['disabled'] });
    // <option> bị đổ lại (đổi danh mục) mà KHÔNG đổi value -> nhãn hiển thị lệch, đồng bộ lại.
    new MutationObserver(syncDisplay).observe(selectEl, { childList: true });
  }

  function enhanceAll(root) {
    if (!root || !root.querySelectorAll) return;
    Array.prototype.forEach.call(root.querySelectorAll('select'), enhanceSelect);
  }

  function boot() {
    enhanceAll(document);
    var targets = [document.getElementById('adminMain'), document.getElementById('adminModalBox')].filter(Boolean);
    targets.forEach(function (target) {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (node) {
            if (node.nodeType !== 1) return;
            if (node.tagName === 'SELECT') enhanceSelect(node);
            else enhanceAll(node);
          });
        });
      }).observe(target, { childList: true, subtree: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
