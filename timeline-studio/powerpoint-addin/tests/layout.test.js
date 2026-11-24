import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSlideLayout, SLIDE_WIDTH, SLIDE_HEIGHT } from '../src/layout.js';
import { SAMPLE_TIMELINE_DATA } from '../src/model.js';

test('calculateSlideLayout: 16:9 幻灯片坐标适配与整体边界', () => {
  const layout = calculateSlideLayout(SAMPLE_TIMELINE_DATA, 'detailed');

  // 画布标准 16:9 坐标系
  assert.equal(layout.slide.width, SLIDE_WIDTH); // 960
  assert.equal(layout.slide.height, SLIDE_HEIGHT); // 540

  // 标题框在顶部安全边距内
  assert.equal(layout.title.left, 40);
  assert.equal(layout.title.top, 32);
  assert.ok(layout.title.width > 500);

  // 标尺轴
  assert.ok(layout.axis.months.length >= 3, '跨越数个月份区间');
  assert.ok(layout.axis.weeks.length > 5, '包含连续周刻度');
});

test('calculateSlideLayout: 泳道与任务坐标在内容区域内', () => {
  const layout = calculateSlideLayout(SAMPLE_TIMELINE_DATA, 'detailed');

  assert.equal(layout.lanes.length, SAMPLE_TIMELINE_DATA.lanes.length);

  layout.lanes.forEach((lane) => {
    assert.equal(lane.rect.left, 40);
    assert.equal(lane.rect.width, 880);
    assert.ok(lane.rect.top >= 120, '泳道位于标尺下方');
    assert.ok(lane.rect.top + lane.rect.height <= SLIDE_HEIGHT - 20, '未超出幻灯片底边距');
  });

  // 普通任务条校验
  assert.ok(layout.tasks.length > 0);
  layout.tasks.forEach((t) => {
    assert.ok(t.rect.left >= layout.axis.boardX, '任务条起始于标尺板内');
    assert.ok(t.rect.left + t.rect.width <= layout.axis.boardX + layout.axis.boardWidth, '任务条未超出右边界');
    assert.ok(t.rect.width >= 20, '任务条设置了最小可见宽度');
    assert.ok(typeof t.displayTitle === 'string' && t.displayTitle.length > 0);
  });

  // 菱形里程碑校验
  assert.ok(layout.milestones.length > 0);
  layout.milestones.forEach((ms) => {
    assert.ok(ms.diamond.width === 15 || ms.diamond.width === 13);
    assert.equal(ms.diamond.width, ms.diamond.height, '菱形等宽高');
    assert.ok(ms.label.left > ms.diamond.left, '里程碑文本置于菱形右侧');
  });
});

test('calculateSlideLayout: 概览 (overview) 与 详细 (detailed) 密度排版对比', () => {
  const detailed = calculateSlideLayout(SAMPLE_TIMELINE_DATA, 'detailed');
  const overview = calculateSlideLayout(SAMPLE_TIMELINE_DATA, 'overview');

  // 详细模式下泳道高度应当大于或等于概览模式
  const detailedLaneH = detailed.lanes[0].rect.height;
  const overviewLaneH = overview.lanes[0].rect.height;
  assert.ok(detailedLaneH >= overviewLaneH, `详细高度 (${detailedLaneH}) 应 >= 概览高度 (${overviewLaneH})`);

  // 任务条高度同样区分密度
  const detailedTaskH = detailed.tasks[0].rect.height;
  const overviewTaskH = overview.tasks[0].rect.height;
  assert.ok(detailedTaskH > overviewTaskH, '详细模式任务条更高');
});

test('calculateSlideLayout: 长文本防溢出截断机制', () => {
  const customData = {
    title: '防溢出测试',
    lanes: [{ id: 'l1', name: '测试泳道' }],
    tasks: [
      {
        id: 'short_bar',
        title: '非常长非常长非常长的标题名称会导致短矩形严重溢出',
        start: '2026-11-01',
        end: '2026-11-02', // 仅1-2天，条很短
        lane: 'l1',
        color: 'green',
        milestone: false
      }
    ]
  };

  const layout = calculateSlideLayout(customData, 'detailed');
  const task = layout.tasks[0];
  assert.equal(task.isTruncated, true, '短条触发自动截断');
  assert.ok(task.displayTitle.endsWith('…'), '展示带省略号的截断文本');
});
