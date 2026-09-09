/* =========================================================
   1. DASHBOARD — dữ liệu thực từ chuyến xe, ghế, đội xe
   ========================================================= */

var DB_CHART_LABELS = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '00:00'];
var DB_CHART_BUCKETS = [[6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23], [0, 1, 2, 3, 4, 5]];

function dbHourBucket(hour) {
  for (var i = 0; i < DB_CHART_BUCKETS.length; i++) {
    if (DB_CHART_BUCKETS[i].indexOf(hour) !== -1) return i;
  }
  return 0;
}

function dbParseTripHour(timeStr) {
  var parts = String(timeStr || '00:00').split(':');
  var h = parseInt(parts[0], 10);
  return isNaN(h) ? 0 : Math.max(0, Math.min(23, h));
}

function dbTripSeatStats(t, seatBank, seatMap) {
  var plan = seatBank[t.id];
  var sold = 0;
  var total = 0;
  if (plan && Array.isArray(plan.down)) {
    var comb = plan.down.concat(plan.up || []);
    comb.forEach(function (s) {
      if (!s || s.state === 'hidden') return;
      total++;
      if (s.state === 'sold' || s.state === 'hold' || s.state === 'cargo') sold++;
    });
  } else {
    total = seatMap[t.vehicleType] || 0;
  }
  return { sold: sold, total: total };
}

function dbBuildHourlyStats(trips, seatBank, seatMap) {
  var counts = DB_CHART_LABELS.map(function () { return 0; });
  var occSum = DB_CHART_LABELS.map(function () { return 0; });
  var occCnt = DB_CHART_LABELS.map(function () { return 0; });

  trips.forEach(function (t) {
    if (!t) return;
    var bucket = dbHourBucket(dbParseTripHour(t.time));
    counts[bucket]++;
    var st = dbTripSeatStats(t, seatBank, seatMap);
    if (st.total > 0) {
      occSum[bucket] += Math.round((st.sold / st.total) * 100);
      occCnt[bucket]++;
    }
  });

  return counts.map(function (count, i) {
    return {
      count: count,
      occupancy: occCnt[i] ? Math.round(occSum[i] / occCnt[i]) : 0
    };
  });
}

function dbBuildWaveChart(hourlyStats) {
  var width = 500;
  var height = 180;
  var padTop = 32;
  var padBottom = 18;
  var values = hourlyStats.map(function (x) { return x.count; });
  var maxVal = Math.max.apply(null, values.concat([1]));
  var peakIdx = 0;
  values.forEach(function (v, i) { if (v >= values[peakIdx]) peakIdx = i; });

  var pts = values.map(function (v, i) {
    return {
      x: values.length === 1 ? width / 2 : (i / (values.length - 1)) * width,
      y: height - padBottom - (v / maxVal) * (height - padTop - padBottom)
    };
  });

  function smoothLine(points) {
    if (points.length < 2) return '';
    var d = 'M' + points[0].x.toFixed(1) + ',' + points[0].y.toFixed(1);
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i === 0 ? i : i - 1];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2] || p2;
      var cp1x = p1.x + (p2.x - p0.x) / 6;
      var cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6;
      var cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C' + cp1x.toFixed(1) + ',' + cp1y.toFixed(1) + ' ' + cp2x.toFixed(1) + ',' + cp2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);
    }
    return d;
  }

  var line = smoothLine(pts);
  var area = line + ' L' + width + ',' + height + ' L0,' + height + ' Z';
  var peak = pts[peakIdx];
  var peakCount = values[peakIdx];
  var peakOcc = hourlyStats[peakIdx].occupancy;
  var badgeText = peakCount
    ? peakCount + ' chuyến · ' + DB_CHART_LABELS[peakIdx] + (peakOcc ? ' · ' + peakOcc + '%' : '')
    : 'Chưa có chuyến';

  return {
    area: area,
    line: line,
    peak: peak,
    badgeText: badgeText,
    hasData: values.some(function (v) { return v > 0; })
  };
}

function dbBuildPieChart(segments) {
  var total = segments.reduce(function (sum, s) { return sum + s.value; }, 0);
  var circumference = 2 * Math.PI * 38;
  var offset = 0;
  var circles = '<circle cx="50" cy="50" r="38" fill="transparent" stroke="#E2E8F0" stroke-width="14"/>';

  if (total > 0) {
    segments.forEach(function (seg) {
      if (!seg.value) return;
      var dash = (seg.value / total) * circumference;
      circles += '<circle cx="50" cy="50" r="38" fill="transparent" stroke="' + seg.color + '" stroke-width="14"' +
        ' stroke-dasharray="' + dash.toFixed(2) + ' ' + (circumference - dash).toFixed(2) + '"' +
        ' stroke-dashoffset="' + (-offset).toFixed(2) + '"/>';
      offset += dash;
    });
  }

  var legend = segments.map(function (seg) {
    return '<div><span class="dot" style="background:' + seg.color + '"></span> ' + esc(seg.label) +
      ' <span style="color:var(--text-sub);">(' + seg.value + ')</span></div>';
  }).join('');

  return {
    svg: circles +
      '<circle cx="50" cy="50" r="16" fill="#FFFFFF"/>' +
      '<text x="50" y="47" fill="#64748B" font-size="8" font-weight="700" text-anchor="middle">Tổng</text>' +
      '<text x="50" y="58" fill="#0F172A" font-size="12" font-weight="800" text-anchor="middle">' + total + '</text>',
    legend: legend,
    total: total
  };
}

function dbToggleCard(title, iconSvg, activeCount, totalCount, unitLabel, viewId, colorClass, isOn) {
  return '<button type="button" class="db-toggle-card ' + colorClass + (isOn ? ' is-on' : '') + '" data-action="switchAdminView" data-args=\'["' + viewId + '"]\'>' +
    '<div class="db-toggle-icon">' + iconSvg + '</div>' +
    '<div class="db-toggle-title">' + esc(title) + '</div>' +
    '<div class="db-toggle-val">' + activeCount + '<span>/' + totalCount + '</span></div>' +
    '<div class="db-toggle-sub">' + esc(unitLabel) + '</div>' +
  '</button>';
}

function dbInfoRow(label, value, dotClass) {
  return '<div class="db-info-row">' +
    '<span class="db-info-dot ' + dotClass + '"></span>' +
    '<span class="db-info-label">' + esc(label) + '</span>' +
    '<span class="db-info-val">' + esc(String(value)) + '</span>' +
  '</div>';
}

function renderDashboard() {
  var trips = getTrips();
  var today = todayISO();
  var seatBank = lsRead(HN_STORAGE_KEY, {});
  var seatMap = FleetStore.vehicleTypeSeats();

  var byStatus = {};
  TRIP_STATUSES.forEach(function (s) { byStatus[s] = 0; });
  trips.forEach(function (t) {
    var s = (t && t.status) || 'Chưa chỉ định xe';
    byStatus[s] = (byStatus[s] || 0) + 1;
  });

  var todayTrips = trips.filter(function (t) { return t && t.date === today; });
  var dirs = FleetStore.getDirections();
  var routes = FleetStore.getRoutes();
  var stations = FleetStore.getStations();
  var vehLine = FleetStore.getVehicles({ scope: 'line' });
  var vehShuttle = FleetStore.getVehicles({ scope: 'shuttle' });
  var staff = FleetStore.getStaff();
  var manifests = Object.keys(getManifests()).length;
  var scheduleItems = typeof getScheduleItems === 'function'
    ? getScheduleItems()
    : lsRead(HN_SCHEDULE_HOURS_KEY, []);

  var activeDirs = dirs.filter(activeOf).length;
  var activeRoutes = routes.filter(activeOf).length;
  var activeVehLine = vehLine.filter(activeOf).length;
  var activeVehShuttle = vehShuttle.filter(activeOf).length;
  var activeStaff = staff.filter(activeOf).length;
  var activeSchedule = scheduleItems.filter(function (x) { return x && x.active !== false && !x.deleted; }).length;

  var todaySelling = todayTrips.filter(function (t) { return t.status === 'Đang bán'; }).length;
  var todayDeparted = todayTrips.filter(function (t) { return t.status === 'Đã khởi hành'; }).length;
  var totalSelling = byStatus['Đang bán'] || 0;
  var sellingRatio = trips.length ? Math.round((totalSelling / trips.length) * 100) : 0;

  var todaySeat = { sold: 0, total: 0 };
  todayTrips.forEach(function (t) {
    var st = dbTripSeatStats(t, seatBank, seatMap);
    todaySeat.sold += st.sold;
    todaySeat.total += st.total;
  });
  var todayOccPct = todaySeat.total ? Math.round((todaySeat.sold / todaySeat.total) * 100) : 0;

  var pie = dbBuildPieChart([
    { label: 'Đang bán',  value: byStatus['Đang bán']       || 0, color: '#C20D08' },
    { label: 'Đã chạy',   value: byStatus['Đã khởi hành']  || 0, color: '#EA580C' },
    { label: 'Chưa gán',  value: (byStatus['Chưa chỉ định xe'] || 0) + (byStatus['Đã chỉ định xe'] || 0), color: '#F59E0B' },
    { label: 'Đã hủy',   value: byStatus['Đã hủy']          || 0, color: '#D97706' }
  ].filter(function (x) { return x.value > 0 || x.label !== 'Đã hủy'; }));

  var hourlyStats = dbBuildHourlyStats(todayTrips, seatBank, seatMap);
  var chart = dbBuildWaveChart(hourlyStats);

  var rows = todayTrips.length
    ? todayTrips.slice().sort(byTime).map(function (t) {
        var seat = dbTripSeatStats(t, seatBank, seatMap);
        var seatLabel = seat.total ? (seat.total - seat.sold) + '/' + seat.total + ' trống' : '—';
        return '<tr>' +
          '<td><div class="db-time-cell"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg><span>' + esc(t.time || '—') + '</span></div></td>' +
          '<td><span class="db-route-name">' + esc(t.route || '—') + '</span></td>' +
          '<td><span class="trip-plate-inline">' + esc(t.plate || 'Chưa gán') + '</span></td>' +
          '<td><span class="db-seat-pill">' + esc(seatLabel) + '</span></td>' +
          '<td>' + statusBadge(t.status) + '</td>' +
          '<td class="row-actions"><button type="button" class="btn btn-sm btn-ghost" data-action="switchAdminView" data-args=\'["viewTrips"]\' title="Xem phơi"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> Xem phơi</button></td>' +
          '</tr>';
      }).join('')
    : '<tr><td colspan="6" class="empty-state"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><p style="margin-top:8px">Chưa có chuyến xe nào cho ngày hôm nay (' + fmtDate(today) + ')</p></td></tr>';

  var html =
    '<div class="db-shell">' +

    '<div class="db-row-top">' +
      '<div class="ref-card ref-card-featured">' +
        '<div class="ref-featured-head"><span class="ref-dot">●</span> Chuyến xe hôm nay</div>' +
        '<div class="ref-featured-val">' + todayTrips.length + '<span class="ref-unit"> chuyến</span></div>' +
        '<div class="ref-featured-sub">' + todaySelling + ' đang bán · ' + todayDeparted + ' đã chạy</div>' +
        '<div class="ref-featured-foot">' +
          '<span>Lấp ghế</span>' +
          '<label class="db-pill-on">' + todayOccPct + '%</label>' +
        '</div>' +
      '</div>' +
      '<div class="ref-card ref-card-metric">' +
        '<div class="ref-card-head-sm"><span class="ref-dot-dark">●</span> Tỷ lệ mở bán phơi</div>' +
        '<div class="ref-metric-val">' + sellingRatio + '<span class="ref-metric-unit">%</span></div>' +
        '<div class="ref-metric-status ' + (sellingRatio > 60 ? 'is-high' : sellingRatio > 30 ? 'is-mid' : 'is-low') + '">' +
          (sellingRatio > 60 ? 'Cao' : sellingRatio > 30 ? 'Bình thường' : 'Thấp') +
        '</div>' +
        '<div class="ref-progress-track">' +
          '<div class="ref-progress-fill" style="width:' + sellingRatio + '%;"></div>' +
          '<div class="ref-progress-thumb" style="left:' + sellingRatio + '%;"></div>' +
        '</div>' +
        '<div class="ref-metric-caption">' + totalSelling + ' / ' + trips.length + ' phơi đang bán</div>' +
      '</div>' +
    '</div>' +

    '<div class="db-row-main">' +
      '<div class="ref-card ref-card-chart">' +
        '<div class="ref-chart-head">' +
          '<div>' +
            '<h4 class="db-card-title">Tải chuyến trong ngày</h4>' +
            '<div class="cell-sub">' + fmtDate(today) + ' · ' + todayTrips.length + ' chuyến</div>' +
          '</div>' +
          '<div class="ref-time-pills"><span class="active">Giờ</span><span>Ngày</span></div>' +
        '</div>' +
        '<div class="ref-chart-svg-wrap">' +
          '<svg viewBox="0 0 500 180" class="ref-chart-svg">' +
            '<defs>' +
              '<linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="#C20D08" stop-opacity="0.42"/>' +
                '<stop offset="100%" stop-color="#EA580C" stop-opacity="0.02"/>' +
              '</linearGradient>' +
            '</defs>' +
            (chart.hasData
              ? '<path d="' + chart.area + '" fill="url(#chartGrad)"/>' +
                '<path d="' + chart.line + '" fill="none" stroke="#C20D08" stroke-width="3" stroke-linecap="round"/>' +
                '<circle cx="' + chart.peak.x.toFixed(1) + '" cy="' + chart.peak.y.toFixed(1) + '" r="5" fill="#EA580C" stroke="#FFFFFF" stroke-width="2"/>' +
                '<g transform="translate(' + Math.max(8, Math.min(380, chart.peak.x - 60)).toFixed(0) + ',' + Math.max(4, chart.peak.y - 28).toFixed(0) + ')">' +
                  '<rect width="120" height="22" rx="11" fill="#C20D08"/>' +
                  '<text x="60" y="15" fill="#FFFFFF" font-size="9.5" font-weight="800" text-anchor="middle">' + esc(chart.badgeText) + '</text>' +
                '</g>'
              : '<text x="250" y="94" fill="#64748B" font-size="13" font-weight="700" text-anchor="middle">Chưa có dữ liệu chuyến trong ngày</text>') +
          '</svg>' +
          '<div class="ref-chart-labels">' +
            DB_CHART_LABELS.map(function (l) { return '<span>' + l + '</span>'; }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="ref-card ref-card-pie-side">' +
        '<div class="ref-card-head-sm"><span class="ref-dot-dark">●</span> Phân bổ phơi xe</div>' +
        '<div class="ref-pie-container ref-pie-container--lg">' +
          '<svg viewBox="0 0 100 100" class="ref-pie-svg ref-pie-svg--lg">' + pie.svg + '</svg>' +
        '</div>' +
        '<div class="ref-pie-legend ref-pie-legend--stack">' + pie.legend + '</div>' +
      '</div>' +
    '</div>' +

    '<div class="db-row-bottom">' +
      '<div class="ref-card db-info-panel">' +
        '<div class="db-card-title">Tổng quan hệ thống</div>' +
        '<div class="db-info-list">' +
          dbInfoRow('Hướng / Tuyến', activeDirs + ' / ' + activeRoutes, 'dot-c1') +
          dbInfoRow('Trạm xe', stations.length, 'dot-c2') +
          dbInfoRow('Manifest vé', manifests, 'dot-c3') +
          dbInfoRow('Tổng phơi xe', trips.length, 'dot-c1') +
        '</div>' +
      '</div>' +
      '<div class="db-toggle-grid">' +
        dbToggleCard('Xe Tuyến',
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
          activeVehLine, vehLine.length, 'xe hoạt động', 'viewVehicles', 'db-toggle-card--c1', activeVehLine > 0) +
        dbToggleCard('Xe Trung Chuyển',
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h14"/><path d="M5 17a2 2 0 0 1-2-2v-3.2a1 1 0 0 1 .3-.7l2.6-2.6A2 2 0 0 1 7.3 8H16a2 2 0 0 1 1.6.8l2.1 2.8a1 1 0 0 0 .5.3l1.4.4a1 1 0 0 1 .7 1v1.7a2 2 0 0 1-2 2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
          activeVehShuttle, vehShuttle.length, 'xe hoạt động', 'viewVehicles', 'db-toggle-card--c2', activeVehShuttle > 0) +
        dbToggleCard('Quản Lý Giờ',
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
          activeSchedule, scheduleItems.length, 'khung giờ', 'viewSchedule', 'db-toggle-card--c3', activeSchedule > 0) +
        dbToggleCard('Nhân Sự',
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
          activeStaff, staff.length, 'nhân sự', 'viewStaff', 'db-toggle-card--c4', activeStaff > 0) +
      '</div>' +
    '</div>' +

    '<div class="ref-card db-table-card">' +
      '<div class="db-card-head">' +
        '<div>' +
          '<h3 style="margin:0">● Danh Sách Chuyến Khởi Hành Hôm Nay (' + fmtDate(today) + ')</h3>' +
          '<div class="cell-sub">Dữ liệu lấy từ phơi xe và sơ đồ ghế thực tế trong hệ thống</div>' +
        '</div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="switchAdminView" data-args=\'["viewTrips"]\'>Quản lý tất cả chuyến</button>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table class="admin-table">' +
          '<thead><tr><th>Giờ đi</th><th>Tuyến đường</th><th>Biển số xe</th><th>Ghế trống</th><th>Trạng thái</th><th class="th-actions">Thao tác</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
    '</div>';

  $('viewDashboard').innerHTML = html;
}

function activeOf(x) { return x && x.active !== false; }
function activeTag(on) {
  return on
    ? '<span class="badge badge-on">Bật</span>'
    : '<span class="badge badge-off">Tắt</span>';
}
function byTime(a, b) { return String(a.time || '').localeCompare(String(b.time || '')); }
function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
function statusBadge(s) {
  s = s || 'Chưa chỉ định xe';
  return '<span class="status-badge ' + (STATUS_CLASS[s] || 'chua-chi-dinh') + '">' + esc(s) + '</span>';
}
