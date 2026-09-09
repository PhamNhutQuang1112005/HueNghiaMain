/* =========================================================
   8. CÀI ĐẶT
   ========================================================= */
function renderSettingsView() {
  $('viewSettings').innerHTML =
    '<div class="table-wrap" style="padding:16px;display:flex;flex-direction:column;gap:12px;max-width:560px;">' +
      '<button class="btn" data-action="adminExportConfig">Xuất cấu hình (JSON)</button>' +
      '<label class="btn" style="justify-content:center;">Nhập cấu hình từ file<input type="file" id="cfgFile" accept="application/json" style="display:none;" data-change-action="adminImportConfig" data-args=\'["__event__"]\'></label>' +
      '<button class="btn btn-danger" data-action="adminResetConfig">Khôi phục cấu hình mặc định</button>' +
      '<span class="hint-inline">Các file JS nạp kèm <code>?v=</code> để tránh cache — khi cập nhật mã, tăng số phiên bản trong HTML.</span>' +
    '</div>';
}
function adminExportConfig() {
  var data = {
    directions: FleetStore.getDirections(), routes: FleetStore.getRoutes(),
    vehicleTypes: FleetStore.getVehicleTypes(), vehicles: FleetStore.getVehicles(), staff: FleetStore.getStaff()
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'huenghia-fleet-config-' + todayISO() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  FleetStore.log({ action: 'export', entity: 'config', summary: 'Xuất cấu hình đội xe' });
}
function adminImportConfig(e) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var d = JSON.parse(reader.result);
      if (!confirm('Ghi đè cấu hình hiện tại bằng nội dung file?')) return;
      if (Array.isArray(d.directions)) FleetStore.setDirections(d.directions);
      if (Array.isArray(d.routes)) FleetStore.setRoutes(d.routes);
      if (Array.isArray(d.vehicleTypes)) FleetStore.setVehicleTypes(d.vehicleTypes);
      if (Array.isArray(d.vehicles)) FleetStore.setVehicles(d.vehicles);
      if (Array.isArray(d.staff)) FleetStore.setStaff(d.staff);
      FleetStore.log({ action: 'import', entity: 'config', summary: 'Nhập cấu hình từ file ' + file.name });
      showToast('Đã nhập cấu hình.');
      switchAdminView(CURRENT_VIEW);
    } catch (err) { showToast('File không hợp lệ.'); }
  };
  reader.readAsText(file);
}
function adminResetConfig() {
  if (!confirm('Xoá toàn bộ cấu hình đội xe và tạo lại theo mặc định? (Chuyến/phơi không bị ảnh hưởng)')) return;
  FleetStore.resetToSeed();
  FleetStore.log({ action: 'reset', entity: 'config', summary: 'Khôi phục cấu hình mặc định' });
  showToast('Đã khôi phục mặc định.');
  switchAdminView(CURRENT_VIEW);
}

/* ---------------------------------------------------------
   BOOT
   --------------------------------------------------------- */
initAdminUserMenu();
initAdminNavGroups();
switchAdminView('viewDashboard');
