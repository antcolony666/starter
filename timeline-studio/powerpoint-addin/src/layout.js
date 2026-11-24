/**
 * 时间线排版与幻灯片几何计算引擎 (Layout Engine)
 * 适配 16:9 标准 PowerPoint 幻灯片坐标系 (960 pt × 540 pt)，
 * 生成包含标题、日期标尺、泳道、任务条和菱形里程碑的精准可编辑几何对象参数。
 */

import { parseIsoDate, dayDifference, calculateTimelineDateRange, formatShortDate, formatMonthLabel, addDays } from './date-utils.js';
import { COLOR_PALETTE } from './model.js';

// 标准 PowerPoint 16:9 幻灯片宽高（磅/点）
export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;

/**
 * 计算整张时间线幻灯片的布局坐标
 * @param {object} timelineData 
 * @param {'detailed'|'overview'} density 
 * @returns {object} 包含所有幻灯片几何对象信息的布局树
 */
export function calculateSlideLayout(timelineData, density = 'detailed') {
  const isOverview = density === 'overview';
  
  // 1. 幻灯片安全边距与区域分配
  const margins = {
    left: 40,
    right: 40,
    top: 32,
    bottom: 30
  };

  const contentWidth = SLIDE_WIDTH - margins.left - margins.right; // 880
  const contentHeight = SLIDE_HEIGHT - margins.top - margins.bottom; // 478

  // 标题区高度
  const titleAreaHeight = 44;
  
  // 泳道标签列宽与时间刻度板宽度
  const laneLabelWidth = 160;
  const boardX = margins.left + laneLabelWidth; // 200
  const boardWidth = contentWidth - laneLabelWidth; // 720

  // 标尺轴高度 (月份栏 + 日期/周栏)
  const monthAxisHeight = 20;
  const weekAxisHeight = 18;
  const totalAxisHeight = monthAxisHeight + weekAxisHeight; // 38

  const axisTop = margins.top + titleAreaHeight + 8; // 84
  const lanesTop = axisTop + totalAxisHeight + 4; // 126

  // 2. 日期范围推导
  const dateRange = calculateTimelineDateRange(timelineData.tasks || [], 5);
  const rangeStartDate = parseIsoDate(dateRange.rangeStart);
  const rangeEndDate = parseIsoDate(dateRange.rangeEnd);
  const totalDays = Math.max(1, dateRange.totalDays);
  const dayWidthPx = boardWidth / totalDays;

  /**
   * 将 ISO 日期转换为刻度板上的 X 坐标
   * @param {string} isoDate 
   * @returns {number}
   */
  function dateToX(isoDate) {
    const d = parseIsoDate(isoDate);
    const offsetDays = dayDifference(rangeStartDate, d);
    return boardX + offsetDays * dayWidthPx;
  }

  // 3. 构建月份与周/刻度标签
  const monthSegments = [];
  let curMonth = new Date(rangeStartDate.getFullYear(), rangeStartDate.getMonth(), 1);
  while (curMonth <= rangeEndDate) {
    const nextMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 1);
    const segStart = Math.max(0, dayDifference(rangeStartDate, curMonth));
    const segEnd = Math.min(totalDays, dayDifference(rangeStartDate, nextMonth));
    
    if (segEnd > segStart) {
      const left = boardX + segStart * dayWidthPx;
      const width = (segEnd - segStart) * dayWidthPx;
      monthSegments.push({
        label: formatMonthLabel(curMonth, true),
        left,
        top: axisTop,
        width,
        height: monthAxisHeight
      });
    }
    curMonth = nextMonth;
  }

  const weekTicks = [];
  for (let i = 0; i < totalDays; i += 7) {
    const tickDate = addDays(rangeStartDate, i);
    const left = boardX + i * dayWidthPx;
    const width = Math.min(7 * dayWidthPx, boardX + boardWidth - left);
    weekTicks.push({
      label: formatShortDate(tickDate),
      left,
      top: axisTop + monthAxisHeight,
      width,
      height: weekAxisHeight
    });
  }

  // 4. 泳道与任务垂直空间排布
  const lanes = timelineData.lanes || [];
  const laneCount = Math.max(1, lanes.length);
  const availableLanesHeight = SLIDE_HEIGHT - margins.bottom - lanesTop;
  
  // 根据密度模式和泳道数量计算每行高度
  let laneHeight;
  if (isOverview) {
    laneHeight = Math.min(62, Math.max(38, Math.floor(availableLanesHeight / laneCount)));
  } else {
    laneHeight = Math.min(84, Math.max(48, Math.floor(availableLanesHeight / laneCount)));
  }

  const taskBarHeight = isOverview ? 20 : 26;
  const milestoneDiamondSize = isOverview ? 13 : 15;

  const layoutLanes = [];
  const layoutTasks = [];
  const layoutMilestones = [];

  lanes.forEach((lane, idx) => {
    const laneY = lanesTop + idx * laneHeight;
    const isEven = idx % 2 === 1;

    layoutLanes.push({
      id: lane.id,
      name: lane.name,
      subtitle: lane.subtitle || '',
      icon: lane.icon || '•',
      tone: lane.tone || 'green',
      rect: {
        left: margins.left,
        top: laneY,
        width: contentWidth,
        height: laneHeight
      },
      labelRect: {
        left: margins.left + 8,
        top: laneY + 4,
        width: laneLabelWidth - 16,
        height: laneHeight - 8
      },
      trackRect: {
        left: boardX,
        top: laneY,
        width: boardWidth,
        height: laneHeight
      },
      backgroundColor: isEven ? '#FBFBF9' : '#FFFFFF',
      borderColor: '#E9EAE5'
    });

    // 筛选当前泳道内的任务
    const laneTasks = (timelineData.tasks || []).filter(t => t.lane === lane.id);

    // 简单分层排布，避免同泳道重叠时高度完全重合
    laneTasks.forEach((task) => {
      const palette = COLOR_PALETTE[task.color] || COLOR_PALETTE.green;
      
      if (task.milestone) {
        // 里程碑：单日菱形
        const centerX = dateToX(task.start) + (dayWidthPx * 0.5);
        const top = laneY + (laneHeight - milestoneDiamondSize) / 2;
        const left = Math.round(centerX - milestoneDiamondSize / 2);

        // 防溢出：标题文本框
        const labelWidth = Math.min(150, SLIDE_WIDTH - margins.right - (left + milestoneDiamondSize + 6));
        
        layoutMilestones.push({
          id: task.id,
          title: task.title,
          date: task.start,
          laneId: lane.id,
          diamond: {
            left,
            top,
            width: milestoneDiamondSize,
            height: milestoneDiamondSize,
            fillColor: palette.pptLine,
            lineColor: palette.pptLine
          },
          label: {
            text: task.title,
            left: left + milestoneDiamondSize + 6,
            top: top - 4,
            width: Math.max(60, labelWidth),
            height: 22,
            fontSize: isOverview ? 8.5 : 9,
            fontColor: palette.text,
            bold: true
          }
        });
      } else {
        // 普通任务条：圆角矩形
        const startX = dateToX(task.start);
        const endX = dateToX(task.end) + dayWidthPx;
        const rawWidth = Math.max(endX - startX, 24);
        
        // 限制在刻度板内部
        const barLeft = Math.max(boardX + 2, startX + 2);
        const barRight = Math.min(boardX + boardWidth - 2, barLeft + rawWidth - 4);
        const barWidth = Math.max(20, barRight - barLeft);
        const barTop = laneY + (laneHeight - taskBarHeight) / 2;

        // 标签防溢出与自适应字体
        const approxCharCapacity = Math.floor(barWidth / 11);
        let displayTitle = task.title;
        let isTruncated = false;

        if (displayTitle.length > approxCharCapacity) {
          isTruncated = true;
          displayTitle = displayTitle.slice(0, Math.max(2, approxCharCapacity - 1)) + '…';
        }

        layoutTasks.push({
          id: task.id,
          title: task.title,
          displayTitle,
          isTruncated,
          status: task.status || 'planned',
          start: task.start,
          end: task.end,
          laneId: lane.id,
          rect: {
            left: barLeft,
            top: barTop,
            width: barWidth,
            height: taskBarHeight,
            fillColor: palette.pptFill,
            lineColor: palette.pptLine,
            lineWidth: 1
          },
          text: {
            fontSize: isOverview ? 8 : (barWidth < 50 ? 8 : 9),
            fontColor: palette.text,
            wordWrap: true
          }
        });
      }
    });
  });

  return {
    slide: {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT
    },
    title: {
      text: timelineData.title || '项目时间线',
      subtitle: `时间跨度: ${dateRange.rangeStart} 至 ${dateRange.rangeEnd} (${totalDays} 天) · 泳道: ${lanes.length} 条 · 任务: ${(timelineData.tasks || []).length} 项`,
      left: margins.left,
      top: margins.top,
      width: contentWidth,
      height: titleAreaHeight
    },
    axis: {
      top: axisTop,
      boardX,
      boardWidth,
      months: monthSegments,
      weeks: weekTicks
    },
    lanes: layoutLanes,
    tasks: layoutTasks,
    milestones: layoutMilestones,
    dateRange
  };
}
