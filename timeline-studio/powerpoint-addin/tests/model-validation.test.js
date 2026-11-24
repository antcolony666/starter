import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLane,
  validateTask,
  validateTimeline,
  loadTimelineFromStorage,
  saveTimelineToStorage,
  SAMPLE_TIMELINE_DATA,
  LOCAL_STORAGE_KEY
} from '../src/model.js';

test('validateLane: 泳道命名、必填项与重复校验', () => {
  const existing = [{ id: 'lane_1', name: '设计' }];
  
  // 正常泳道
  const ok = validateLane({ id: 'lane_2', name: '开发' }, existing);
  assert.equal(ok.valid, true);
  assert.equal(ok.errors.length, 0);

  // 空名称
  const emptyName = validateLane({ id: 'lane_2', name: '   ' }, existing);
  assert.equal(emptyName.valid, false);
  assert.ok(emptyName.errors.some(e => e.includes('泳道名称不能为空')));

  // 重复 ID
  const duplicate = validateLane({ id: 'lane_1', name: '新设计' }, existing);
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.errors.some(e => e.includes('已存在')));
});

test('validateTask: 普通任务起止日、里程碑与泳道有效性校验', () => {
  const lanes = [{ id: 'dev', name: '工程开发' }];

  // 正常任务
  const validTask = {
    id: 't1',
    title: '实现核心架构',
    start: '2026-11-01',
    end: '2026-11-10',
    lane: 'dev',
    milestone: false
  };
  const res1 = validateTask(validTask, lanes);
  assert.equal(res1.valid, true);

  // 错误：结束日期早于开始日期
  const invalidDateOrder = {
    ...validTask,
    start: '2026-11-10',
    end: '2026-11-05'
  };
  const res2 = validateTask(invalidDateOrder, lanes);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some(e => e.includes('不能早于开始日期')));

  // 里程碑：忽略结束日期（单日）
  const milestoneTask = {
    id: 'm1',
    title: '版本发布',
    start: '2026-11-20',
    end: '2026-11-20',
    lane: 'dev',
    milestone: true
  };
  const res3 = validateTask(milestoneTask, lanes);
  assert.equal(res3.valid, true);

  // 泳道不存在
  const missingLaneTask = {
    ...validTask,
    lane: 'non_existent_lane'
  };
  const res4 = validateTask(missingLaneTask, lanes);
  assert.equal(res4.valid, false);
  assert.ok(res4.errors.some(e => e.includes('不存在')));
});

test('validateTimeline: 整套时间线完整性检查', () => {
  // 完整标准示例数据应当完全合法
  const sampleRes = validateTimeline(SAMPLE_TIMELINE_DATA);
  assert.equal(sampleRes.valid, true);

  // 空标题
  const noTitle = validateTimeline({ ...SAMPLE_TIMELINE_DATA, title: '  ' });
  assert.equal(noTitle.valid, false);
  assert.ok(noTitle.errors.some(e => e.includes('标题不能为空')));

  // 空泳道
  const noLanes = validateTimeline({ ...SAMPLE_TIMELINE_DATA, lanes: [] });
  assert.equal(noLanes.valid, false);
  assert.ok(noLanes.errors.some(e => e.includes('至少需要包含一条泳道')));

  // 空任务
  const noTasks = validateTimeline({ ...SAMPLE_TIMELINE_DATA, tasks: [] });
  assert.equal(noTasks.valid, false);
  assert.ok(noTasks.errors.some(e => e.includes('没有任务或里程碑')));
});

test('localStorage 持久化与示例数据回退', () => {
  const mockStorage = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, val) { this.store[key] = String(val); }
  };

  // 初始空存储时加载默认数据
  const initial = loadTimelineFromStorage(mockStorage);
  assert.equal(initial.title, SAMPLE_TIMELINE_DATA.title);

  // 保存自定义修改
  initial.title = '2027 年度战略路线图';
  saveTimelineToStorage(initial, mockStorage);
  assert.ok(mockStorage.getItem(LOCAL_STORAGE_KEY).includes('2027 年度战略路线图'));

  // 再次读取
  const reloaded = loadTimelineFromStorage(mockStorage);
  assert.equal(reloaded.title, '2027 年度战略路线图');
});
