/**
 * 任务窗格主逻辑控制器 (Taskpane Controller)
 * 纯原生浏览器 ES 模块，连接编辑器、数据模型、SVG 画板与 VSTO/WebView2 消息桥。
 */

import {
  SAMPLE_TIMELINE_DATA,
  COLOR_PALETTE,
  STATUS_OPTIONS,
  loadTimelineFromStorage,
  saveTimelineToStorage,
  validateTimeline,
  validateTask,
  validateLane
} from './model.js';
import { formatIsoDate, addDays } from './date-utils.js';
import { renderTimelineSvgPreview } from './preview.js';
import { checkOfficeHostStatus, insertTimelineToPowerPoint } from './office-powerpoint.js';

// 应用状态
let timelineData = loadTimelineFromStorage();
let activeTab = 'tasks'; // 'tasks' | 'lanes'
let editingTaskId = null;
let editingLaneId = null;
let selectedTaskColor = 'green';
let selectedLaneTone = 'green';

// DOM 元素引用
const $ = (id) => document.getElementById(id);

/**
 * 显示友好提示信息 (Toast)
 * @param {string} msg 
 */
function showToast(msg) {
  const toast = $('toastNotice');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

/**
 * 显示顶部警告栏 (Alert Bar)
 * @param {string} msg 
 * @param {'error'|'info'} type 
 */
function showAlert(msg, type = 'error') {
  const alertEl = $('topAlert');
  if (!alertEl) return;
  if (!msg) {
    alertEl.classList.remove('show', 'error', 'info');
    alertEl.textContent = '';
    return;
  }
  alertEl.textContent = msg;
  alertEl.className = `alert-bar show ${type}`;
}

/**
 * 更新 Office 宿主连接状态徽章
 */
function updateHostStatusBadge() {
  const badge = $('hostStatusBadge');
  const dot = $('hostStatusDot');
  const text = $('hostStatusText');
  const status = checkOfficeHostStatus();

  if (status.isPowerPoint) {
    badge.className = 'host-badge connected';
    dot.style.backgroundColor = '#526f59';
    text.textContent = '已连接 PowerPoint';
    badge.title = status.message;
  } else {
    badge.className = 'host-badge disconnected';
    dot.style.backgroundColor = '#c4883b';
    text.textContent = '浏览器预览模式';
    badge.title = status.message;
  }
}

/**
 * 刷新 SVG 实时预览画板
 */
function refreshPreview() {
  const container = $('previewCanvasWrap');
  if (container) {
    renderTimelineSvgPreview(container, timelineData, timelineData.density || 'detailed');
  }
}

/**
 * 保存数据并更新视图
 */
function persistAndSync(skipPreview = false) {
  saveTimelineToStorage(timelineData);
  if (!skipPreview) {
    refreshPreview();
  }
}

/**
 * 渲染泳道管理列表
 */
function renderLanesList() {
  const container = $('lanesList');
  if (!container) return;
  container.innerHTML = '';

  if (!timelineData.lanes || timelineData.lanes.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.style.padding = '14px';
    emptyNotice.style.color = 'var(--tempo-muted)';
    emptyNotice.style.textAlign = 'center';
    emptyNotice.textContent = '暂无泳道，请点击下方按钮新建';
    container.appendChild(emptyNotice);
    return;
  }

  timelineData.lanes.forEach((lane) => {
    const card = document.createElement('div');
    card.className = 'list-item-card';

    const left = document.createElement('div');
    left.className = 'item-left';

    const iconSpan = document.createElement('span');
    iconSpan.style.fontSize = '14px';
    iconSpan.textContent = lane.icon || '•';

    const titleBox = document.createElement('div');
    titleBox.className = 'item-title-box';

    const titleText = document.createElement('div');
    titleText.className = 'item-title';
    titleText.textContent = lane.name;

    const subText = document.createElement('div');
    subText.className = 'item-sub';
    const taskCount = (timelineData.tasks || []).filter(t => t.lane === lane.id).length;
    subText.textContent = `${lane.subtitle || '工作流'} · 包含 ${taskCount} 项任务`;

    titleBox.appendChild(titleText);
    titleBox.appendChild(subText);
    left.appendChild(iconSpan);
    left.appendChild(titleBox);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.title = '编辑泳道';
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', () => openLaneModal(lane.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon btn-danger';
    deleteBtn.title = '删除泳道';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', () => deleteLane(lane.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(left);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

/**
 * 渲染任务与里程碑列表
 */
function renderTasksList() {
  const container = $('tasksList');
  if (!container) return;
  container.innerHTML = '';

  if (!timelineData.tasks || timelineData.tasks.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.style.padding = '14px';
    emptyNotice.style.color = 'var(--tempo-muted)';
    emptyNotice.style.textAlign = 'center';
    emptyNotice.textContent = '暂无任务或里程碑，请点击下方按钮新建或加载示例';
    container.appendChild(emptyNotice);
    return;
  }

  timelineData.tasks.forEach((task) => {
    const card = document.createElement('div');
    card.className = 'list-item-card';

    const left = document.createElement('div');
    left.className = 'item-left';

    const badge = document.createElement('span');
    badge.className = 'item-badge';
    const palette = COLOR_PALETTE[task.color] || COLOR_PALETTE.green;
    badge.style.backgroundColor = palette.bg;
    badge.style.color = palette.text;
    badge.textContent = task.milestone ? '◆ 里程碑' : (task.status === 'done' ? '✓ 完成' : (task.status === 'active' ? '● 进行中' : '○ 待办'));

    const titleBox = document.createElement('div');
    titleBox.className = 'item-title-box';

    const titleText = document.createElement('div');
    titleText.className = 'item-title';
    titleText.textContent = task.title;

    const subText = document.createElement('div');
    subText.className = 'item-sub';
    const laneObj = (timelineData.lanes || []).find(l => l.id === task.lane);
    const laneName = laneObj ? laneObj.name : '未分类';
    const dateStr = task.milestone ? task.start : `${task.start} 至 ${task.end}`;
    subText.textContent = `${laneName} · ${dateStr}`;

    titleBox.appendChild(titleText);
    titleBox.appendChild(subText);
    left.appendChild(badge);
    left.appendChild(titleBox);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.title = '编辑任务';
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', () => openTaskModal(task.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon btn-danger';
    deleteBtn.title = '删除任务';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(left);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

/**
 * 切换选项卡
 * @param {'tasks'|'lanes'} tab 
 */
function switchTab(tab) {
  activeTab = tab;
  $('tabTasks').classList.toggle('active', tab === 'tasks');
  $('tabLanes').classList.toggle('active', tab === 'lanes');
  $('tasksViewSection').style.display = tab === 'tasks' ? 'block' : 'none';
  $('lanesViewSection').style.display = tab === 'lanes' ? 'block' : 'none';
}

/**
 * 打开泳道编辑模态框
 * @param {string|null} laneId 
 */
function openLaneModal(laneId = null) {
  editingLaneId = laneId;
  const modal = $('laneModalMask');
  const titleEl = $('laneModalTitle');
  const nameInput = $('laneNameInput');
  const subtitleInput = $('laneSubtitleInput');
  const iconInput = $('laneIconInput');

  if (laneId) {
    const lane = (timelineData.lanes || []).find(l => l.id === laneId);
    titleEl.textContent = '编辑泳道';
    nameInput.value = lane ? lane.name : '';
    subtitleInput.value = lane ? (lane.subtitle || '') : '';
    iconInput.value = lane ? (lane.icon || '•') : '•';
    selectedLaneTone = lane ? (lane.tone || 'green') : 'green';
  } else {
    titleEl.textContent = '新建泳道';
    nameInput.value = '';
    subtitleInput.value = '';
    iconInput.value = '•';
    selectedLaneTone = 'green';
  }

  modal.classList.add('open');
  nameInput.focus();
}

function closeLaneModal() {
  $('laneModalMask').classList.remove('open');
  editingLaneId = null;
}

/**
 * 打开任务/里程碑编辑模态框
 * @param {string|null} taskId 
 */
function openTaskModal(taskId = null) {
  editingTaskId = taskId;
  const modal = $('taskModalMask');
  const titleEl = $('taskModalTitle');
  const nameInput = $('taskTitleInput');
  const startInput = $('taskStartInput');
  const endInput = $('taskEndInput');
  const laneSelect = $('taskLaneSelect');
  const statusSelect = $('taskStatusSelect');
  const isMilestoneCheckbox = $('taskIsMilestone');

  // 填充泳道下拉菜单
  laneSelect.innerHTML = '';
  (timelineData.lanes || []).forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = `${l.icon || ''} ${l.name}`;
    laneSelect.appendChild(opt);
  });

  const todayStr = formatIsoDate(new Date());

  if (taskId) {
    const task = (timelineData.tasks || []).find(t => t.id === taskId);
    titleEl.textContent = '编辑任务/里程碑';
    nameInput.value = task ? task.title : '';
    startInput.value = task ? task.start : todayStr;
    endInput.value = task ? task.end : todayStr;
    laneSelect.value = task ? task.lane : (timelineData.lanes[0]?.id || '');
    statusSelect.value = task ? (task.status || 'planned') : 'planned';
    isMilestoneCheckbox.checked = Boolean(task?.milestone);
    selectedTaskColor = task ? (task.color || 'green') : 'green';
  } else {
    titleEl.textContent = '新建任务/里程碑';
    nameInput.value = '';
    startInput.value = todayStr;
    endInput.value = formatIsoDate(addDays(new Date(), 10));
    laneSelect.value = timelineData.lanes[0]?.id || '';
    statusSelect.value = 'planned';
    isMilestoneCheckbox.checked = false;
    selectedTaskColor = 'green';
  }

  // 里程碑联动：单日时隐藏/禁用结束日期
  handleMilestoneCheckboxChange();
  renderColorPickerBubbles();

  modal.classList.add('open');
  nameInput.focus();
}

function closeTaskModal() {
  $('taskModalMask').classList.remove('open');
  editingTaskId = null;
}

function handleMilestoneCheckboxChange() {
  const isMilestone = $('taskIsMilestone').checked;
  const endGroup = $('taskEndGroup');
  const endInput = $('taskEndInput');
  const startInput = $('taskStartInput');
  if (isMilestone) {
    endInput.value = startInput.value;
    endGroup.style.opacity = '0.5';
    endInput.disabled = true;
  } else {
    endGroup.style.opacity = '1';
    endInput.disabled = false;
  }
}

/**
 * 渲染颜色选择气泡
 */
function renderColorPickerBubbles() {
  const wrap = $('colorPickerRow');
  if (!wrap) return;
  wrap.innerHTML = '';

  Object.values(COLOR_PALETTE).forEach((c) => {
    const bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = `color-bubble ${c.id === selectedTaskColor ? 'selected' : ''}`;
    bubble.style.backgroundColor = c.bg;
    bubble.style.borderColor = c.border;
    bubble.title = c.name;
    bubble.addEventListener('click', () => {
      selectedTaskColor = c.id;
      renderColorPickerBubbles();
    });
    wrap.appendChild(bubble);
  });
}

/**
 * 删除泳道
 * @param {string} laneId 
 */
function deleteLane(laneId) {
  const lane = (timelineData.lanes || []).find(l => l.id === laneId);
  if (!lane) return;
  const count = (timelineData.tasks || []).filter(t => t.lane === laneId).length;
  const confirmMsg = count > 0 
    ? `确定删除泳道“${lane.name}”？\n注意：该泳道下的 ${count} 个任务也将一并移除！`
    : `确定删除泳道“${lane.name}”？`;
  
  if (confirm(confirmMsg)) {
    timelineData.lanes = timelineData.lanes.filter(l => l.id !== laneId);
    timelineData.tasks = timelineData.tasks.filter(t => t.lane !== laneId);
    persistAndSync();
    renderLanesList();
    renderTasksList();
    showToast('泳道已删除');
  }
}

/**
 * 删除任务
 * @param {string} taskId 
 */
function deleteTask(taskId) {
  const task = (timelineData.tasks || []).find(t => t.id === taskId);
  if (!task) return;
  if (confirm(`确定删除“${task.title}”？`)) {
    timelineData.tasks = timelineData.tasks.filter(t => t.id !== taskId);
    persistAndSync();
    renderTasksList();
    renderLanesList();
    showToast('任务已删除');
  }
}

/**
 * 初始化所有事件监听
 */
function initEvents() {
  // 标题输入
  const titleInput = $('timelineTitleInput');
  titleInput.value = timelineData.title || '';
  titleInput.addEventListener('input', (e) => {
    timelineData.title = e.target.value.trim();
    persistAndSync();
  });

  // 密度切换
  const overviewBtn = $('densityOverviewBtn');
  const detailedBtn = $('densityDetailedBtn');

  function updateDensityButtons() {
    const isOverview = timelineData.density === 'overview';
    overviewBtn.classList.toggle('active', isOverview);
    detailedBtn.classList.toggle('active', !isOverview);
  }

  updateDensityButtons();

  overviewBtn.addEventListener('click', () => {
    timelineData.density = 'overview';
    updateDensityButtons();
    persistAndSync();
    showToast('已切换为概览密度');
  });

  detailedBtn.addEventListener('click', () => {
    timelineData.density = 'detailed';
    updateDensityButtons();
    persistAndSync();
    showToast('已切换为详细密度');
  });

  // 插入幻灯片按钮
  $('btnInsertTimeline').addEventListener('click', async () => {
    showAlert('');
    const validation = validateTimeline(timelineData);
    if (!validation.valid) {
      showAlert(validation.errors.join('； '), 'error');
      return;
    }

    const insertBtn = $('btnInsertTimeline');
    const originalText = insertBtn.textContent;
    insertBtn.disabled = true;
    insertBtn.textContent = '⏳ 正在插入原生形状…';

    try {
      const result = await insertTimelineToPowerPoint(timelineData, timelineData.density || 'detailed');
      showToast(result.message);
      showAlert(result.message, 'info');
    } catch (err) {
      console.error('插入时间线失败:', err);
      showAlert(err.message || '插入形状失败，请检查 PowerPoint 宿主状态。', 'error');
    } finally {
      insertBtn.disabled = false;
      insertBtn.textContent = originalText;
    }
  });

  // 重置示例数据
  $('btnResetSample').addEventListener('click', () => {
    if (confirm('确定要恢复为默认的“Q4 产品发布”示例时间线吗？当前未保存的修改将被覆盖。')) {
      timelineData = structuredClone(SAMPLE_TIMELINE_DATA);
      titleInput.value = timelineData.title;
      updateDensityButtons();
      persistAndSync();
      renderLanesList();
      renderTasksList();
      showToast('已恢复默认示例时间线');
    }
  });

  // 清空数据
  $('btnClearAll').addEventListener('click', () => {
    if (confirm('确定要清空全部泳道与任务吗？')) {
      timelineData = {
        title: '新建时间线',
        density: 'detailed',
        lanes: [],
        tasks: []
      };
      titleInput.value = timelineData.title;
      persistAndSync();
      renderLanesList();
      renderTasksList();
      showToast('已清空时间线数据');
    }
  });

  // 选项卡切换
  $('tabTasks').addEventListener('click', () => switchTab('tasks'));
  $('tabLanes').addEventListener('click', () => switchTab('lanes'));

  // 新建按钮
  $('btnOpenAddTask').addEventListener('click', () => {
    if (!timelineData.lanes || timelineData.lanes.length === 0) {
      showAlert('请先添加至少一条泳道，再添加任务或里程碑。', 'error');
      switchTab('lanes');
      openLaneModal();
      return;
    }
    openTaskModal();
  });
  $('btnOpenAddLane').addEventListener('click', () => openLaneModal());

  // 泳道表单提交
  $('laneForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('laneNameInput').value.trim();
    const subtitle = $('laneSubtitleInput').value.trim();
    const icon = $('laneIconInput').value.trim() || '•';

    const lanePayload = {
      id: editingLaneId || `lane_${Date.now()}`,
      name,
      subtitle,
      icon,
      tone: selectedLaneTone
    };

    const res = validateLane(lanePayload, timelineData.lanes, editingLaneId);
    if (!res.valid) {
      alert(res.errors.join('\n'));
      return;
    }

    if (editingLaneId) {
      const idx = timelineData.lanes.findIndex(l => l.id === editingLaneId);
      if (idx !== -1) timelineData.lanes[idx] = lanePayload;
    } else {
      timelineData.lanes.push(lanePayload);
    }

    persistAndSync();
    renderLanesList();
    renderTasksList();
    closeLaneModal();
    showToast(editingLaneId ? '泳道已更新' : '已添加新泳道');
  });

  $('btnCloseLaneModal').addEventListener('click', closeLaneModal);
  $('btnCancelLaneModal').addEventListener('click', closeLaneModal);

  // 任务表单提交
  $('taskIsMilestone').addEventListener('change', handleMilestoneCheckboxChange);
  $('taskStartInput').addEventListener('input', () => {
    if ($('taskIsMilestone').checked) {
      $('taskEndInput').value = $('taskStartInput').value;
    }
  });

  $('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('taskTitleInput').value.trim();
    const start = $('taskStartInput').value;
    const isMilestone = $('taskIsMilestone').checked;
    const end = isMilestone ? start : $('taskEndInput').value;
    const lane = $('taskLaneSelect').value;
    const status = $('taskStatusSelect').value;

    const taskPayload = {
      id: editingTaskId || `task_${Date.now()}`,
      title,
      start,
      end,
      lane,
      status,
      color: selectedTaskColor,
      milestone: isMilestone
    };

    const res = validateTask(taskPayload, timelineData.lanes);
    if (!res.valid) {
      alert(res.errors.join('\n'));
      return;
    }

    if (editingTaskId) {
      const idx = timelineData.tasks.findIndex(t => t.id === editingTaskId);
      if (idx !== -1) timelineData.tasks[idx] = taskPayload;
    } else {
      timelineData.tasks.push(taskPayload);
    }

    persistAndSync();
    renderTasksList();
    renderLanesList();
    closeTaskModal();
    showToast(editingTaskId ? '任务已更新' : '已添加新任务');
  });

  $('btnCloseTaskModal').addEventListener('click', closeTaskModal);
  $('btnCancelTaskModal').addEventListener('click', closeTaskModal);
}

/**
 * 启动初始化
 */
export function initializeTaskpane() {
  window.addEventListener('tempo-host-status', updateHostStatusBadge);
  updateHostStatusBadge();
  initEvents();
  renderLanesList();
  renderTasksList();
  refreshPreview();
}

// VSTO 任务窗格使用随插件部署的本地页面，无需 Office.js 就绪回调。
document.addEventListener('DOMContentLoaded', () => {
  initializeTaskpane();
});
