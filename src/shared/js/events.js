// shared/events.js — Dispatcher trung tâm thay cho inline onclick/onchange/... rải rác trong HTML/JS.
// Nạp bằng <script> thường SAU khi toàn bộ hàm nghiệp vụ (shared/*.js + script chính của trang) đã
// định nghĩa xong trên window — vì registry bên dưới tra hàm động qua window[tên hàm] tại thời điểm bấm,
// không phải tại thời điểm nạp trang.
//
// Cách dùng ở HTML/JS (thay cho onclick="fn(this,'a',1)"):
//   data-action="fn" data-args='["__this__","a",1]'
// Với các event khác click, dùng thuộc tính riêng: data-change-action, data-input-action,
// data-blur-action, data-submit-action (cùng cú pháp data-args).
// Token đặc biệt trong data-args, được thay bằng giá trị thật lúc bấm (không lưu tĩnh):
//   "__this__"       → phần tử đang bấm (tương đương `this` trong onclick cũ)
//   "__event__"      → đối tượng Event
//   "__this_value__" → el.value tại thời điểm sự kiện xảy ra (cho input/change đọc giá trị đang gõ)
// Thêm data-stop-propagation="1" trên phần tử nếu code gốc có gọi event.stopPropagation() trước khi
// gọi hàm chính.
//
// Một số chỗ gốc gọi 2 hàm liên tiếp trong 1 onclick/onchange (không tách được thành 1 hàm đơn) —
// đăng ký thành "synthetic action" trong SYNTHETIC_ACTIONS bên dưới, giữ đúng hành vi gốc.

(function () {
  var SPECIAL = {
    '__this__': function (el, evt) { return el; },
    '__event__': function (el, evt) { return evt; },
    '__this_value__': function (el, evt) { return el.value; }
  };

  function resolveArgs(rawArgs, el, evt) {
    return rawArgs.map(function (a) {
      if (typeof a === 'string' && SPECIAL.hasOwnProperty(a)) return SPECIAL[a](el, evt);
      return a;
    });
  }

  function readArgs(el) {
    var raw = el.getAttribute('data-args');
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[events.js] data-args không hợp lệ trên phần tử:', el, raw, e);
      return [];
    }
  }

  // Vài chỗ gốc gọi liên tiếp 2 hàm trong cùng 1 onclick/onchange/oninput — không quy về 1 hàm đơn được,
  // đăng ký riêng để giữ đúng hành vi thay vì ép chuyển thành nhiều data-action trên cùng 1 phần tử.
  var SYNTHETIC_ACTIONS = {
    refreshPickupPreviewAndPrice: function () {
      window.refreshPickupPreview();
      window.refreshPickupPrice();
    },
    filterDropdownAndCheckDriverConflict: function () {
      window.filterDropdown('driverDropdownContainer');
      window.checkDriverConflict();
    },
    // seat-footbtn: rỗng thì "Đặt vé", đã có khách thì "Sửa" — xem seatCard()/appendix trong booking.js
    // Lưu ý: gọi qua fn.apply(el, args) nên phần tử bấm nằm ở `this`, KHÔNG phải tham số hàm.
    // Nút này mở thẳng panel đặt/sửa vé, KHÔNG đi qua onSeatClick — trang ticketstaff.html khóa bán vé
    // theo vòng đời chuyến (tsIsSellingLocked, xem ticketstaff-manifest-ui.js) qua việc bọc onSeatClick,
    // nên phải tự kiểm tra khóa ở đây nữa, nếu không nhân viên vẫn mở/sửa được vé bằng nút này ngay cả khi
    // chuyến đã khởi hành hoặc đã đóng Re-open. callcenter.html không có khái niệm này nên chỉ áp dụng khi
    // các hàm/biến tương ứng tồn tại.
    // `currentTripId` là biến `let` top-level của ticketstaff.js — nằm trong global lexical scope dùng
    // CHUNG giữa các classic script, KHÔNG phải thuộc tính của window (window.currentTripId luôn
    // undefined, khiến lần khóa trước đây vô tác dụng). Đọc qua `typeof` để trên callcenter.html — nơi
    // không khai báo biến này — không văng ReferenceError.
    seatFootBtnClick: function () {
      if (window.blockIfMultiSelectActive()) return;
      var lockTripId = (typeof currentTripId !== 'undefined') ? currentTripId : undefined;
      if (typeof window.tsIsSellingLocked === 'function' && window.tsIsSellingLocked(lockTripId)) {
        if (typeof window.showToast === 'function') {
          window.showToast('Chuyến đã khởi hành — bấm "Re-open" ở đầu trang để thao tác lại trên sơ đồ ghế');
        }
        return;
      }
      var code = this.getAttribute('data-seat-code');
      var seat = window.findSeat(code);
      if (this.getAttribute('data-edit-mode') === '1') {
        window.openBookingPanel([seat], { mode: 'edit' });
      } else {
        window.openBookingPanel([seat]);
      }
    },
    closeSeatMenuAndStartTransfer: function (sourceCode) {
      window.closeSeatMenu();
      window.startTransferMode(sourceCode);
    },
    searchResultRowClick: function (phone, phoneOrName) {
      window.fillSearchInputWithPhone(phone);
      window.openCustomerHistory(phoneOrName);
    },
    submitCustomerForm: function (evt) {
      evt.preventDefault();
      window.saveCustomer();
    }
  };

  function resolveFn(name) {
    if (Object.prototype.hasOwnProperty.call(SYNTHETIC_ACTIONS, name)) return SYNTHETIC_ACTIONS[name];
    var fn = window[name];
    return typeof fn === 'function' ? fn : null;
  }

  function dispatch(kind, attr) {
    return function (evt) {
      var el = evt.target.closest('[' + attr + ']');
      if (!el) return;
      var name = el.getAttribute(attr);
      var fn = resolveFn(name);
      if (!fn) {
        console.warn('[events.js] Không tìm thấy hàm cho ' + attr + '="' + name + '"');
        return;
      }
      if (el.getAttribute('data-stop-propagation') === '1') evt.stopPropagation();
      var args = resolveArgs(readArgs(el), el, evt);
      fn.apply(el, args);
    };
  }

  // Đăng ký ở capture phase: đúng với thứ tự event.stopPropagation() được gọi TRƯỚC khi bubble lên
  // phần tử cha trong code gốc, và để nghe được cả sự kiện không bubble (blur).
  document.addEventListener('click', dispatch('click', 'data-action'), true);
  document.addEventListener('change', dispatch('change', 'data-change-action'), true);
  document.addEventListener('input', dispatch('input', 'data-input-action'), true);
  document.addEventListener('blur', dispatch('blur', 'data-blur-action'), true);
  document.addEventListener('submit', dispatch('submit', 'data-submit-action'), true);
})();
