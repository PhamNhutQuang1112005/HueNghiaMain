// Chạy: node netting.test.js
const assert = require('assert');
const { computeDebts, net } = require('./netting.js');
const received = { manifestId: 1, arrivalScanned: true };

// COD chỉ phát sinh sau khi vào phơi, nhận kiện và giao thành công.
const codOrder = { stationFrom: '508 Kinh Dương Vương', stationTo: 'Châu Đốc', codAmount: 10000 };
for (const order of [
  { ...codOrder, status: 'pending' },
  { ...codOrder, manifestId: 1, status: 'in-transit' },
  { ...codOrder, ...received, status: 'in-transit' },
  { ...codOrder, manifestId: 1, status: 'delivered' },
  { ...codOrder, arrivalScanned: true, status: 'delivered' },
  { ...codOrder, ...received, isUnreceived: true, status: 'delivered' },
  { ...codOrder, ...received, status: 'returned' },
  { ...codOrder, ...received, codAmount: 0, status: 'delivered' },
  { ...codOrder, ...received, stationFrom: 'Chưa gán', status: 'delivered' }
]) {
  assert.deepStrictEqual(computeDebts([order], []), {});
}
const delivered = { ...codOrder, ...received, status: 'delivered' };
assert.strictEqual(net(computeDebts([delivered], []), 'Trạm Châu Đốc', '508 Kinh Dương Vương'), 10000);
// Đơn đã giao từ luồng nhận cũ chỉ có cờ isScanned vẫn được đối soát.
assert.strictEqual(net(computeDebts([{ ...delivered, arrivalScanned: undefined, isScanned: true }], []), 'Châu Đốc', '508 Kinh Dương Vương'), 10000);

// Trạm lưu trên đơn quyết định cặp đối soát, kể cả khi phơi đi qua các trạm khác.
const transferredCod = {
  ...delivered,
  orderStationFrom: delivered.stationFrom,
  orderStationTo: delivered.stationTo,
  stationFrom: 'Sài Gòn, 508 Kinh Dương Vương',
  stationTo: 'Trạm Vịnh Tre'
};
const existingDebt = { moneyAmount: 5000, stationFrom: 'Trạm Châu Đốc', stationTo: '508 Kinh Dương Vương' };
const total = computeDebts([existingDebt, transferredCod], []);
assert.strictEqual(net(total, 'Trạm Châu Đốc', '508 Kinh Dương Vương'), 15000);
assert.strictEqual(net(total, 'Trạm Vịnh Tre', 'Sài Gòn, 508 Kinh Dương Vương'), 0);
assert.deepStrictEqual(computeDebts([{ ...transferredCod, orderStationFrom: undefined, orderStationTo: undefined }], []), {});

// A gửi tiền thường 10tr đến B (A nợ B 10tr); B gửi 5tr đến A (B nợ A 5tr) => A nợ B ròng 5tr.
const cargos = [
  { cargoCategory: 'cash', moneyAmount: '10000000', stationFrom: 'A', stationTo: 'B' },
  { cargoCategory: 'hot', moneyAmount: '5000000', stationFrom: 'B', stationTo: 'A' },
  { codAmount: 1000, status: 'pending', stationFrom: 'A', stationTo: 'B' } // COD chưa giao: không tính
];
assert.strictEqual(net(computeDebts(cargos, []), 'A', 'B'), 5000000);

// A trả B 2tr => còn 3tr
const afterPay = computeDebts(cargos, [{ kind: 'pay', from: 'A', to: 'B', amount: 2000000 }]);
assert.strictEqual(net(afterPay, 'A', 'B'), 3000000);

// Chuyển 5tr qua C: A–B hết nợ, A nợ C 5tr, C nợ B 5tr
const re = computeDebts(cargos, [{ kind: 'reroute', from: 'A', to: 'B', via: 'C', amount: 5000000 }]);
assert.strictEqual(net(re, 'A', 'B'), 0);
assert.strictEqual(net(re, 'A', 'C'), 5000000);
assert.strictEqual(net(re, 'C', 'B'), 5000000);

// Đơn tách khi chuyển phơi (đơn gốc giữ COD, đơn tách codAmount 0): chỉ tính 1 lần
assert.strictEqual(net(computeDebts([
  { ...received, code: 'X', codAmount: 500000, status: 'delivered', stationFrom: 'SG', stationTo: 'CD' },
  { ...received, code: 'X.12', codAmount: 0, status: 'delivered', stationFrom: 'SG', stationTo: 'CD' }
], []), 'CD', 'SG'), 500000);

// COD đã giao: B thu hộ => B nợ A
const cod = computeDebts([{ ...received, codAmount: 700, status: 'delivered', stationFrom: 'A', stationTo: 'B' }], []);
assert.strictEqual(net(cod, 'B', 'A'), 700);
console.log('ok');

// Phân tích theo nguồn tiền giữa A và B
const { breakdown } = require('./netting.js');
const b = breakdown([
  { cargoCategory: 'cash', moneyAmount: '10', stationFrom: 'A', stationTo: 'B' },
  { cargoCategory: 'partner_cash', moneyAmount: '1', stationFrom: 'A', stationTo: 'B' },
  { cargoCategory: 'hot', moneyAmount: '5', stationFrom: 'B', stationTo: 'A' },
  { ...received, codAmount: 7, status: 'delivered', stationFrom: 'A', stationTo: 'B' }
], 'A', 'B');
assert.deepStrictEqual(b, { cash: [11, 0], hot: [0, 5], cod: [0, 7] });
console.log('ok breakdown');

// Đơn tiền cũ lưu nhầm 'goods' vẫn được tính
assert.strictEqual(net(computeDebts([{ cargoCategory: 'goods', moneyAmount: '9', stationFrom: 'A', stationTo: 'B' }], []), 'A', 'B'), 9);
console.log('ok legacy');

// breakdown không truyền y: gộp với mọi trạm
assert.deepStrictEqual(breakdown([
  { moneyAmount: '10', cargoCategory: 'cash', stationFrom: 'A', stationTo: 'B' },
  { moneyAmount: '4', cargoCategory: 'hot', stationFrom: 'C', stationTo: 'A' }
], 'A'), { cash: [10, 0], hot: [0, 4], cod: [0, 0] });
console.log('ok all-stations');

// Tên trạm lệch tiền tố "Trạm ": đơn ghi "Châu Đốc", ô chọn ghi "Trạm Châu Đốc" vẫn phải ra COD
assert.strictEqual(net(computeDebts([{ ...received, codAmount: 500000, status: 'delivered', stationFrom: 'Sài Gòn', stationTo: 'Châu Đốc' }], []), 'Trạm Châu Đốc', 'Sài Gòn'), 500000);
console.log('ok station-name');
