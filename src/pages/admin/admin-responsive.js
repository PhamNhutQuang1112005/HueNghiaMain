/* =========================================================
   RESPONSIVE BẢNG ADMIN — gắn nhãn cột (data-label) cho mọi ô <td> của .admin-table.
   Màn hình nhỏ (≤1100px) admin.css biến mỗi hàng thành 1 thẻ và hiện "TÊN CỘT: giá trị" bằng
   td::before { content: attr(data-label) } nên không phải cuộn ngang. Bảng do JS các view dựng lại
   mỗi lần đổi trang/lọc → quan sát #adminMain và gắn nhãn lại sau mỗi lần DOM đổi (chỉ ghi attribute,
   không đổi cấu trúc nên không tự kích hoạt lại observer).
   ========================================================= */
(function () {
  function labelTable(table) {
    var head = table.tHead && table.tHead.rows[table.tHead.rows.length - 1];
    if (!head) return;
    var labels = [];
    Array.prototype.forEach.call(head.cells, function (th) {
      var text = (th.textContent || '').replace(/\s+/g, ' ').trim();
      for (var i = 0; i < (th.colSpan || 1); i++) labels.push(text);
    });
    Array.prototype.forEach.call(table.tBodies, function (tb) {
      Array.prototype.forEach.call(tb.rows, function (tr) {
        var col = 0;
        Array.prototype.forEach.call(tr.cells, function (td) {
          var label = labels[col] || '';
          if (label && td.getAttribute('data-label') !== label) td.setAttribute('data-label', label);
          else if (!label && td.hasAttribute('data-label')) td.removeAttribute('data-label');
          col += td.colSpan || 1;
        });
      });
    });
  }
  function labelAll() {
    Array.prototype.forEach.call(document.querySelectorAll('.admin-view table.admin-table, .admin-view table.pax-table'), labelTable);
  }

  var main = document.getElementById('adminMain');
  if (!main || !window.MutationObserver) return;
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; labelAll(); });
  }).observe(main, { childList: true, subtree: true });
  labelAll();
})();
