/**
 * 数据模型与校验模块 (Data Model & Validation)
 * 沿用 Tempo 朴素浅绿主调与色彩配置，支持泳道、任务、单日里程碑和本地持久化。
 */

import { isValidIsoDate, parseIsoDate, dayDifference, formatIsoDate } from './date-utils.js';

export const LOCAL_STORAGE_KEY = 'tempo_powerpoint_timeline_v1';

/**
 * 经典 Tempo 商务配色方案
 */
export const COLOR_PALETTE = {
  green: {
    id: 'green',
    name: '草木绿',
    bg: '#E7EFE7',
    border: '#4D6B52',
    text: '#3D5945',
    pptFill: '#E7EFE7',
    pptLine: '#4D6B52'
  },
  violet: {
    id: 'violet',
    name: '淡紫罗兰',
    bg: '#EDE9F8',
    border: '#7463A6',
    text: '#5C4E8A',
    pptFill: '#EDE9F8',
    pptLine: '#7463A6'
  },
  blue: {
    id: 'blue',
    name: '晴空蓝',
    bg: '#E5EEF7',
    border: '#4C769D',
    text: '#365C80',
    pptFill: '#E5EEF7',
    pptLine: '#4C769D'
  },
  peach: {
    id: 'peach',
    name: '暖桃橙',
    bg: '#F7E9E1',
    border: '#A9684A',
    text: '#884E34',
    pptFill: '#F7E9E1',
    pptLine: '#A9684A'
  },
  yellow: {
    id: 'yellow',
    name: '晨曦黄',
    bg: '#F5EFD5',
    border: '#927A3D',
    text: '#766129',
    pptFill: '#F5EFD5',
    pptLine: '#927A3D'
  },
  gray: {
    id: 'gray',
    name: '素雅灰',
    bg: '#EEEFEB',
    border: '#6F736A',
    text: '#51554C',
    pptFill: '#EEEFEB',
    pptLine: '#6F736A'
  }
};

/**
 * 任务完成状态选项
 */
export const STATUS_OPTIONS = [
  { id: 'planned', label: '待开始', badge: '待开始' },
  { id: 'active', label: '进行中', badge: '进行中' },
  { id: 'done', label: '已完成', badge: '已完成' }
];

/**
 * 默认示例数据 (与 timeline-studio/index.html 视觉及数据模型一致)
 */
export const SAMPLE_TIMELINE_DATA = {
  title: 'Q4 产品发布',
  density: 'detailed', // 'overview' (概览) 或 'detailed' (详细)
  lanes: [
    { id: 'research', name: '研究与策略', subtitle: '对齐问题与方向', icon: '⌕', tone: 'green' },
    { id: 'design', name: '产品设计', subtitle: '体验与视觉系统', icon: '✳', tone: 'violet' },
    { id: 'build', name: '工程开发', subtitle: '构建核心体验', icon: '⌘', tone: 'blue' },
    { id: 'launch', name: '发布与增长', subtitle: '测试、上线与复盘', icon: '↗', tone: 'peach' }
  ],
  tasks: [
    { id: 'e1', title: '竞品扫描', start: '2026-10-27', end: '2026-11-06', lane: 'research', color: 'green', status: 'done', milestone: false },
    { id: 'e2', title: '定位与范围确认', start: '2026-11-09', end: '2026-11-20', lane: 'research', color: 'green', status: 'done', milestone: false },
    { id: 'e3', title: '用户旅程与流程图', start: '2026-11-16', end: '2026-11-27', lane: 'design', color: 'violet', status: 'active', milestone: false },
    { id: 'e4', title: '视觉方向探索', start: '2026-11-23', end: '2026-12-04', lane: 'design', color: 'violet', status: 'active', milestone: false },
    { id: 'e5', title: '设计系统搭建', start: '2026-12-01', end: '2026-12-18', lane: 'design', color: 'violet', status: 'planned', milestone: false },
    { id: 'e6', title: '数据模型与 API', start: '2026-12-08', end: '2026-12-18', lane: 'build', color: 'blue', status: 'planned', milestone: false },
    { id: 'e7', title: '核心功能开发', start: '2026-12-14', end: '2027-01-15', lane: 'build', color: 'blue', status: 'planned', milestone: false },
    { id: 'e8', title: '封闭测试', start: '2027-01-18', end: '2027-01-29', lane: 'launch', color: 'peach', status: 'planned', milestone: false },
    { id: 'e9', title: '公开发布', start: '2027-02-02', end: '2027-02-02', lane: 'launch', color: 'yellow', status: 'planned', milestone: true }
  ]
};

/**
 * 校验单条泳道输入
 * @param {object} lane 
 * @param {Array<object>} existingLanes 
 * @param {string|null} currentId 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateLane(lane, existingLanes = [], currentId = null) {
  const errors = [];
  if (!lane || typeof lane !== 'object') {
    return { valid: false, errors: ['泳道数据格式无效'] };
  }

  const name = (lane.name || '').trim();
  if (!name) {
    errors.push('泳道名称不能为空');
  } else if (name.length > 50) {
    errors.push('泳道名称不能超过 50 个字符');
  }

  const id = (lane.id || '').trim();
  if (!id) {
    errors.push('泳道标识符不能为空');
  } else {
    const isDuplicate = existingLanes.some(l => l.id === id && l.id !== currentId);
    if (isDuplicate) {
      errors.push(`泳道标识符 "${id}" 已存在`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 校验单条任务/里程碑输入
 * @param {object} task 
 * @param {Array<object>} availableLanes 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTask(task, availableLanes = []) {
  const errors = [];
  if (!task || typeof task !== 'object') {
    return { valid: false, errors: ['任务数据格式无效'] };
  }

  const title = (task.title || '').trim();
  if (!title) {
    errors.push('任务/里程碑名称不能为空');
  } else if (title.length > 80) {
    errors.push('任务名称过长，请控制在 80 个字符内');
  }

  if (!isValidIsoDate(task.start)) {
    errors.push('开始日期格式错误，请使用 YYYY-MM-DD');
  }

  const isMilestone = Boolean(task.milestone);
  if (!isMilestone) {
    if (!isValidIsoDate(task.end)) {
      errors.push('结束日期格式错误，请使用 YYYY-MM-DD');
    } else if (isValidIsoDate(task.start)) {
      const diff = dayDifference(task.start, task.end);
      if (diff < 0) {
        errors.push(`结束日期 (${task.end}) 不能早于开始日期 (${task.start})`);
      }
    }
  }

  if (availableLanes.length > 0) {
    const laneExists = availableLanes.some(l => l.id === task.lane);
    if (!laneExists) {
      errors.push(`所属泳道 "${task.lane}" 不存在`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 校验整套时间线数据完整性
 * @param {object} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTimeline(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['时间线数据为空或格式不正确'] };
  }

  const title = (data.title || '').trim();
  if (!title) {
    errors.push('时间线标题不能为空');
  }

  if (!Array.isArray(data.lanes) || data.lanes.length === 0) {
    errors.push('时间线至少需要包含一条泳道');
  } else {
    data.lanes.forEach((lane, idx) => {
      const laneRes = validateLane(lane, data.lanes, lane.id);
      if (!laneRes.valid) {
        errors.push(`第 ${idx + 1} 条泳道错误: ${laneRes.errors.join('; ')}`);
      }
    });
  }

  if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
    errors.push('时间线没有任务或里程碑，请先添加至少一项内容');
  } else {
    data.tasks.forEach((task, idx) => {
      const taskRes = validateTask(task, data.lanes || []);
      if (!taskRes.valid) {
        errors.push(`第 ${idx + 1} 项任务 ("${task.title || '未命名'}") 错误: ${taskRes.errors.join('; ')}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 从 localStorage 读取数据，若不存在或损坏则返回样本数据
 * @param {Storage} storage 
 * @returns {object}
 */
export function loadTimelineFromStorage(storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  if (!storage) {
    return structuredClone(SAMPLE_TIMELINE_DATA);
  }
  try {
    const raw = storage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return structuredClone(SAMPLE_TIMELINE_DATA);
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.lanes) && Array.isArray(parsed.tasks)) {
      return parsed;
    }
  } catch (err) {
    console.warn('从 localStorage 加载时间线失败，使用默认示例:', err);
  }
  return structuredClone(SAMPLE_TIMELINE_DATA);
}

/**
 * 将数据持久化到 localStorage
 * @param {object} data 
 * @param {Storage} storage 
 * @returns {boolean}
 */
export function saveTimelineToStorage(data, storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  if (!storage) return false;
  try {
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('保存时间线到 localStorage 失败:', err);
    return false;
  }
}
