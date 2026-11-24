/**
 * 日期工具库 (Date Utilities)
 * 纯逻辑模块，提供 ISO 日期校验、转换、跨度计算与显示格式化。
 */

const MS_PER_DAY = 86400000;

/**
 * 校验字符串是否为合法的 YYYY-MM-DD 格式
 * @param {string} dateStr 
 * @returns {boolean}
 */
export function isValidIsoDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  
  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
}

/**
 * 将 YYYY-MM-DD 解析为本地 Date 对象（00:00:00）
 * @param {string} dateStr 
 * @returns {Date}
 */
export function parseIsoDate(dateStr) {
  if (!isValidIsoDate(dateStr)) {
    throw new Error(`无效的日期格式，必须为 YYYY-MM-DD: ${dateStr}`);
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * 将 Date 对象格式化为 YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
export function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 在给定日期上增加或减少若干天
 * @param {Date|string} dateInput 
 * @param {number} days 
 * @returns {Date}
 */
export function addDays(dateInput, days) {
  const base = typeof dateInput === 'string' ? parseIsoDate(dateInput) : new Date(dateInput);
  const result = new Date(base.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 计算两个日期之间的相差天数 (end - start)
 * @param {Date|string} startInput 
 * @param {Date|string} endInput 
 * @returns {number}
 */
export function dayDifference(startInput, endInput) {
  const start = typeof startInput === 'string' ? parseIsoDate(startInput) : startInput;
  const end = typeof endInput === 'string' ? parseIsoDate(endInput) : endInput;
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * 计算某日期相对于基准起始日期的天数偏移
 * @param {Date|string} target 
 * @param {Date|string} rangeStart 
 * @returns {number}
 */
export function getDayOffset(target, rangeStart) {
  return dayDifference(rangeStart, target);
}

/**
 * 格式化为短日期标签，如 "11/27"
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatShortDate(dateInput) {
  const d = typeof dateInput === 'string' ? parseIsoDate(dateInput) : dateInput;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 格式化月份标签，如 "2026年11月" 或 "11月"
 * @param {Date|string} dateInput 
 * @param {boolean} includeYear 
 * @returns {string}
 */
export function formatMonthLabel(dateInput, includeYear = true) {
  const d = typeof dateInput === 'string' ? parseIsoDate(dateInput) : dateInput;
  const m = d.getMonth() + 1;
  return includeYear ? `${d.getFullYear()}年${m}月` : `${m}月`;
}

/**
 * 根据任务列表自动推断合适的时间线日期范围（含前后缓冲）
 * @param {Array<{start: string, end: string}>} tasks 
 * @param {number} bufferDays 
 * @returns {{ rangeStart: string, rangeEnd: string, totalDays: number }}
 */
export function calculateTimelineDateRange(tasks = [], bufferDays = 7) {
  const validTasks = tasks.filter(t => isValidIsoDate(t.start) && isValidIsoDate(t.end));
  
  if (validTasks.length === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = addDays(today, -7);
    const end = addDays(today, 60);
    return {
      rangeStart: formatIsoDate(start),
      rangeEnd: formatIsoDate(end),
      totalDays: dayDifference(start, end)
    };
  }

  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const t of validTasks) {
    const sTime = parseIsoDate(t.start).getTime();
    const eTime = parseIsoDate(t.end).getTime();
    if (sTime < minTime) minTime = sTime;
    if (eTime > maxTime) maxTime = eTime;
  }

  // 扩展缓冲天数，并对齐到周一以获得美观的周/月视图
  let startDate = addDays(new Date(minTime), -bufferDays);
  const dayOfWeek = startDate.getDay(); // 0 是周日
  const diffToMonday = (dayOfWeek + 6) % 7;
  startDate = addDays(startDate, -diffToMonday);

  let endDate = addDays(new Date(maxTime), bufferDays);
  const endDayOfWeek = endDate.getDay();
  const diffToSunday = (7 - endDayOfWeek) % 7;
  endDate = addDays(endDate, diffToSunday);

  const totalDays = Math.max(7, dayDifference(startDate, endDate));

  return {
    rangeStart: formatIsoDate(startDate),
    rangeEnd: formatIsoDate(endDate),
    totalDays
  };
}
