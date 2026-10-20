// Chạy: node netting.test.js
const assert = require('assert');
const { computeDebts, net } = require('./netting.js');

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

// COD đã giao: B thu hộ => B nợ A
const cod = computeDebts([{ codAmount: 700, status: 'delivered', stationFrom: 'A', stationTo: 'B' }], []);
assert.strictEqual(net(cod, 'B', 'A'), 700);
console.log('ok');

// Phân tích theo nguồn tiền giữa A và B
const { breakdown } = require('./netting.js');
const b = breakdown([
  { cargoCategory: 'cash', moneyAmount: '10', stationFrom: 'A', stationTo: 'B' },
  { cargoCategory: 'partner_cash', moneyAmount: '1', stationFrom: 'A', stationTo: 'B' },
  { cargoCategory: 'hot', moneyAmount: '5', stationFrom: 'B', stationTo: 'A' },
  { codAmount: 7, status: 'delivered', stationFrom: 'A', stationTo: 'B' }
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
