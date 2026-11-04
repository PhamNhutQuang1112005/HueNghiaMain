/**
 * Logic Quản lý & Đối soát tiền thu hộ (COD) giữa các chi nhánh
 * Huệ Nghĩa Express
 */

const COD_STORAGE_KEY = 'hueNghia_codTickets';
const CARGO_STORAGE_KEY = 'hueNghia_cargos';

// Toast Notification
function showCodToast(msg, type = 'success') {
  let toastContainer = document.getElementById('codToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'codToastContainer';
    toastContainer.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:8px; pointer-events:none;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 12px 18px;
    border-radius: 8px;
    background: ${type === 'error' ? '#ef4444' : '#0f172a'};
    color: white;
    font-weight: 600;
    font-size: 13.5px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.18);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✅'}</span> <span>${msg}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}
