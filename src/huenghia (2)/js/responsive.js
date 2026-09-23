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
  const isCollapsed = localStorage.getItem('hueNghia_sidebar_collapsed') === 'true';
  if (isCollapsed && appSidebar && window.innerWidth > 768) {
    appSidebar.classList.add('is-collapsed');
  }

  // Collapse / Expand toggle logic for entire Sidebar
  if (sidebarToggleBtn && appSidebar) {
    sidebarToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      appSidebar.classList.toggle('is-collapsed');
      const collapsedNow = appSidebar.classList.contains('is-collapsed');
      localStorage.setItem('hueNghia_sidebar_collapsed', collapsedNow);
    });
  }

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
  const FILTER_BC_LABELS = { goods: 'Hàng hóa', cash: 'Tiền thường', hot: 'Tiền nóng', baga: 'Baga' };
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
