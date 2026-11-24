import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidIsoDate,
  parseIsoDate,
  formatIsoDate,
  addDays,
  dayDifference,
  getDayOffset,
  formatShortDate,
  formatMonthLabel,
  calculateTimelineDateRange
} from '../src/date-utils.js';

test('isValidIsoDate: 校验合规与非法日期', () => {
  assert.equal(isValidIsoDate('2026-11-22'), true);
  assert.equal(isValidIsoDate('2024-02-29'), true, '闰年2月29日合法');
  assert.equal(isValidIsoDate('2025-02-29'), false, '平年2月29日不合法');
  assert.equal(isValidIsoDate('2026-04-31'), false, '4月只有30天');
  assert.equal(isValidIsoDate('2026-13-01'), false, '月份超出范围');
  assert.equal(isValidIsoDate('invalid-date'), false);
  assert.equal(isValidIsoDate(null), false);
  assert.equal(isValidIsoDate(undefined), false);
  assert.equal(isValidIsoDate(''), false);
});

test('parseIsoDate 与 formatIsoDate: 准确转换与往返一致性', () => {
  const isoStr = '2026-10-27';
  const parsed = parseIsoDate(isoStr);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 9); // 0-indexed 10月
  assert.equal(parsed.getDate(), 27);
  assert.equal(formatIsoDate(parsed), isoStr);

  assert.throws(() => parseIsoDate('2026-02-30'), /无效的日期格式/);
});

test('addDays 与 dayDifference: 跨月跨年加减天数与间隔计算', () => {
  const d1 = '2026-12-30';
  const d2 = '2027-01-05';
  assert.equal(dayDifference(d1, d2), 6);
  assert.equal(dayDifference(d2, d1), -6);
  assert.equal(dayDifference(d1, d1), 0);

  const advanced = addDays(d1, 6);
  assert.equal(formatIsoDate(advanced), '2027-01-05');

  const back = addDays(d2, -6);
  assert.equal(formatIsoDate(back), '2026-12-30');
});

test('getDayOffset 与标签格式化', () => {
  assert.equal(getDayOffset('2026-11-05', '2026-11-01'), 4);
  assert.equal(formatShortDate('2026-11-09'), '11/9');
  assert.equal(formatMonthLabel('2026-11-09', true), '2026年11月');
  assert.equal(formatMonthLabel('2026-11-09', false), '11月');
});

test('calculateTimelineDateRange: 自动计算并适度扩展时间线范围', () => {
  const tasks = [
    { start: '2026-11-01', end: '2026-11-15' },
    { start: '2026-12-01', end: '2026-12-25' }
  ];
  const range = calculateTimelineDateRange(tasks, 5);
  assert.ok(range.totalDays > 55, '包含缓冲天数');
  assert.ok(range.rangeStart <= '2026-10-27', '向起始日前置缓冲');
  assert.ok(range.rangeEnd >= '2026-12-30', '向结束日后置缓冲');

  // 空任务时提供兜底范围
  const emptyRange = calculateTimelineDateRange([], 7);
  assert.ok(emptyRange.totalDays >= 60);
  assert.equal(typeof emptyRange.rangeStart, 'string');
});
