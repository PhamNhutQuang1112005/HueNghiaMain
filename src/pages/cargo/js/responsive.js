function toggleNavGroup(groupId, event) {
  const evt = event || window.event;
  if (evt) {
    if (typeof evt.preventDefault === 'function') evt.preventDefault();
    if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
  }
  const group = document.getElementById(groupId);
  if (group) {
    group.classList.toggle('open');
  }
}

/**
 * Sidebar and Responsive Layout Controller for Huệ Nghĩa Express
 */
document.addEventListener('DOMContentLoaded', () => {
  const appSidebar = document.getElementById('appSidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const mobileSidebarBtn = document.getElementById('mobileSidebarBtn');
  let backdrop = document.querySelector('.sidebar-backdrop');

  // Create backdrop element if not existing
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  // Restore sidebar collapse state from localStorage (desktop)
  // Mobile (<=768px): drawer đầy đủ chữ, không is-collapsed. Tablet (<=992px): luôn thu gọn lúc tải
  // để không chiếm chỗ bảng. Desktop: theo lựa chọn đã lưu. Chỉ tính lại khi đổi nhóm màn hình.
  // matchMedia (không dùng innerWidth) để JS luôn khớp với breakpoint CSS.
  const isNarrow = (px) => window.matchMedia('(max-width: ' + px + 'px)').matches;
  const modeOf = () => (isNarrow(768) ? 'm' : isNarrow(992) ? 't' : 'd');
  let lastMode = null;
  const syncCollapsed = () => {
    if (!appSidebar || modeOf() === lastMode) return;
    lastMode = modeOf();
    const want = lastMode === 't' || (lastMode === 'd' && localStorage.getItem('hueNghia_sidebar_collapsed') === 'true');
    appSidebar.classList.toggle('is-collapsed', want);
  };
  syncCollapsed();
  window.addEventListener('resize', syncCollapsed);

  // Collapse / Expand toggle logic for entire Sidebar
  if (sidebarToggleBtn && appSidebar) {
    sidebarToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isNarrow(768)) {
        // Mobile: slide-in/out sidebar
        appSidebar.classList.toggle('mobile-open');
        if (backdrop) backdrop.classList.toggle('active');
      } else {
        // Desktop: collapse/expand sidebar
        appSidebar.classList.toggle('is-collapsed');
        const collapsedNow = appSidebar.classList.contains('is-collapsed');
        if (!isNarrow(992)) localStorage.setItem('hueNghia_sidebar_collapsed', collapsedNow);
      }
    });
  }

  // Mặc định mở sẵn mọi nhóm menu (Nhận hàng/Giao hàng + submenu), bấm để thu lại
  document.querySelectorAll('.sidebar-nav-group, .sidebar-subgroup').forEach(g => g.classList.add('open'));

  // Event delegation for all chevron clicks and accordion toggles
  document.addEventListener('click', (e) => {
    // 1. Chevron icon click
    const chevron = e.target.closest('.submenu-chevron');
    if (chevron) {
      e.preventDefault();
      e.stopPropagation();
      const subgroup = chevron.closest('.sidebar-subgroup');
      const group = chevron.closest('.sidebar-nav-group');
      if (subgroup) {
        subgroup.classList.toggle('open');
      } else if (group) {
        group.classList.toggle('open');
      }
      return;
    }

    // 2. Nav group header click (e.g. NHẬN HÀNG / GIAO HÀNG headers)
    const groupHeader = e.target.closest('.nav-group-header');
    if (groupHeader) {
      e.preventDefault();
      e.stopPropagation();
      // If inline onclick exists and handled it, don't double toggle
      const onclickAttr = groupHeader.getAttribute('onclick');
      if (!onclickAttr) {
        const group = groupHeader.closest('.sidebar-nav-group');
        if (group) {
          group.classList.toggle('open');
        }
      }
      return;
    }

    // 3. Submenu toggle link click (e.g. Nhận hàng / Giao hàng sub-items)
    const subToggle = e.target.closest('#cargoSubmenuToggle, #deliverySubmenuToggle');
    if (subToggle) {
      const href = subToggle.getAttribute('href');
      const currentPath = window.location.pathname;
      const isCurrentPage = href && (currentPath.endsWith(href) || (href.endsWith('cargo.html') && (currentPath.endsWith('/html/') || currentPath.endsWith('/'))) || (href.endsWith('delivery.html') && currentPath.includes('delivery.html')));
      
      if (isCurrentPage) {
        e.preventDefault();
        e.stopPropagation();
        const subgroup = subToggle.closest('.sidebar-subgroup') || subToggle.closest('.sidebar-nav-group');
        if (subgroup) {
          subgroup.classList.toggle('open');
        }
      }
    }
  });

  // Mobile menu slide-in toggle
  if (mobileSidebarBtn && appSidebar) {
    mobileSidebarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      appSidebar.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active');
    });
  }

  // Close mobile sidebar on backdrop click
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (appSidebar) appSidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    });
  }

  // Close mobile sidebar on pressing Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (appSidebar) appSidebar.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('active');
    }
  });

  // Cập nhật mục cuối breadcrumb theo tên bộ lọc trạng thái đang chọn (Tất cả/Hàng hóa/Tiền
  // thưởng/Tiền nóng/Baga) — giữ nguyên tiêu đề trang mặc định khi đang ở "Tất cả".
  const FILTER_BC_LABELS = { goods: 'Hàng hóa', cash: 'Tiền thường', partner_cash: 'Bạn hàng gửi tiền thường', hot: 'Tiền nóng', baga: 'Baga' };
  const bcCurrentEl = document.querySelector('.page-breadcrumb .bc-current');
  const defaultBcLabel = bcCurrentEl ? bcCurrentEl.textContent : '';
  function updateFilterBreadcrumb(val) {
    if (!bcCurrentEl) return;
    bcCurrentEl.textContent = FILTER_BC_LABELS[val] || defaultBcLabel;
  }

  // Sync radio button status options if clicked in sidebar or main area
  const urlFilter = new URLSearchParams(window.location.search).get('filter');
  const currentPath = window.location.pathname;
  const isDeliveryPage = currentPath.includes('delivery.html');
  const isCargoPage = currentPath.includes('cargo.html') || currentPath.endsWith('/html/') || currentPath.endsWith('/');

  const activeCategory = urlFilter || (isDeliveryPage ? localStorage.getItem('hueNghia_selectedDeliveryCategory') : localStorage.getItem('hueNghia_selectedCategory')) || 'all';

  // CHỈ khôi phục trạng thái filter (và tô active) khi đang thực sự đứng ở cargo.html/delivery.html —
  // nếu không check (isCargoPage || isDeliveryPage), khối này chạy trên MỌI trang (vì sidebar lặp lại
  // y hệt ở cả 7 trang) và luôn tô sáng "Tất cả" mặc định, đè lên active-state đúng của trang đó
  // (vd: đứng ở manifest.html mà "Tất cả" trong submenu Nhận hàng vẫn sáng cùng lúc với "Danh sách
  // chuyến xe đi").
  if (urlFilter === 'overdue') {
    document.querySelectorAll('.sidebar-nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('overdueNavItem')?.classList.add('active');
  } else if ((isCargoPage || isDeliveryPage) && activeCategory) {
    const targetSelector = isDeliveryPage ? '#deliverySubmenu .status-option' : '#cargoSubmenu .status-option';
    const targetOptions = document.querySelectorAll(targetSelector);
    if (targetOptions.length > 0) {
      targetOptions.forEach(opt => {
        const radio = opt.querySelector('input[type="radio"]');
        if (radio && radio.value === activeCategory) {
          targetOptions.forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          radio.checked = true;
        }
      });
      updateFilterBreadcrumb(activeCategory);
    }
  }

  const statusOptions = document.querySelectorAll('.sidebar-status-slider .status-option');
  statusOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      // Prevent double firing when clicking inside <label> which triggers click on inner <input>
      if (e.target.tagName === 'INPUT') return;

      const radio = opt.querySelector('input[type="radio"]');
      const val = radio ? radio.value : 'all';
      const isDeliveryFilter = (radio && radio.name === 'deliveryStateFilter') || opt.closest('#deliverySubmenu');

      if (isDeliveryFilter) {
        document.querySelectorAll('#deliverySubmenu .status-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        localStorage.setItem('hueNghia_selectedDeliveryCategory', val);

        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const pathNow = window.location.pathname;
        if (!pathNow.includes('delivery.html')) {
          window.location.href = `delivery.html?filter=${val}`;
        } else {
          updateFilterBreadcrumb(val);
        }
      } else {
        document.querySelectorAll('#cargoSubmenu .status-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        localStorage.setItem('hueNghia_selectedCategory', val);

        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const pathNow = window.location.pathname;
        const isOnCargoPage = pathNow.includes('cargo.html') || pathNow.endsWith('/html/') || pathNow.endsWith('/');
        if (!isOnCargoPage) {
          window.location.href = `cargo.html?filter=${val}`;
        } else {
          updateFilterBreadcrumb(val);
        }
      }
    });
  });

  // Ensure tables are wrapped in .table-wrapper
  const tables = document.querySelectorAll('table.data-table, section.table-card table');
  tables.forEach(table => {
    if (!table.parentElement.classList.contains('table-wrapper') && !table.parentElement.classList.contains('table-scroll')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });

  // Auto-format currency inputs with thousand separators (e.g. 3500 -> 3.500)
  document.addEventListener('input', (e) => {
    const target = e.target;
    if (
      target &&
      (target.classList.contains('format-currency-input') ||
        target.id === 'newTotalCollected' ||
        target.id === 'modalTotalCollected' ||
        target.id === 'modalSubmittedAmount' ||
        target.id === 'modalDiffAmount' ||
        target.id === 'cargoCodAmount')
    ) {
      const rawDigits = target.value.replace(/\D/g, '');
      if (!rawDigits) {
        target.value = '';
        return;
      }
      const num = parseInt(rawDigits, 10);
      target.value = num.toLocaleString('vi-VN');
    }
  });
});

/* Bảng dạng thẻ xếp dọc ở <=992px (css/responsive.css): gắn nhãn cột vào từng ô và bọc nội dung ô
   để CSS xếp "NHÃN | giá trị" mà không phải cuộn ngang. Chạy lại mỗi khi tbody được vẽ lại. */
(function () {
  function label(table) {
    var heads = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) {
      return th.textContent.replace(/\s+/g, ' ').trim();
    });
    table.querySelectorAll('tbody tr').forEach(function (tr) {
      if (tr.children.length !== heads.length) return; // dòng rỗng (colspan)
      Array.prototype.forEach.call(tr.children, function (td, i) {
        if (td.dataset.l) return;
        td.dataset.l = '1';
        td.setAttribute('data-label', heads[i]);
        var v = document.createElement('div');
        v.className = 'td-val';
        while (td.firstChild) v.appendChild(td.firstChild);
        td.appendChild(v);
      });
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.table-scroll table, table.cargo-table').forEach(function (t) {
      label(t);
      var body = t.querySelector('tbody');
      if (body) new MutationObserver(function () { label(t); }).observe(body, { childList: true });
    });
  });
})();
