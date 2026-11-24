/**
 * 任务窗格内嵌 SVG 预览组件 (Timeline SVG Preview)
 * 将计算后的布局以 16:9 SVG 缩略画板展示在任务窗格顶部，
 * 让用户在点击插入前直观看到原生形状的排版效果。
 */

import { calculateSlideLayout, SLIDE_WIDTH, SLIDE_HEIGHT } from './layout.js';

/**
 * 转义 XML / SVG 字符防止注入
 * @param {string} str 
 * @returns {string}
 */
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 生成并渲染时间线 SVG 预览到指定容器
 * @param {HTMLElement} container 
 * @param {object} timelineData 
 * @param {'detailed'|'overview'} density 
 */
export function renderTimelineSvgPreview(container, timelineData, density = 'detailed') {
  if (!container) return;

  const layout = calculateSlideLayout(timelineData, density);
  const parts = [];

  // SVG 根标签 (16:9 画布)
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}" class="preview-svg-canvas">`);
  
  // 幻灯片白色背景
  parts.push(`<rect width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" fill="#FFFFFF" rx="4"/>`);
  parts.push(`<rect width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" fill="none" stroke="#E9EAE5" stroke-width="1"/>`);

  // 标题与副标题
  parts.push(`<text x="${layout.title.left}" y="${layout.title.top + 20}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#20211F">${escapeXml(layout.title.text)}</text>`);
  parts.push(`<text x="${layout.title.left}" y="${layout.title.top + 38}" font-family="system-ui, -apple-system, sans-serif" font-size="9" fill="#858780">${escapeXml(layout.title.subtitle)}</text>`);

  // 月份标尺
  layout.axis.months.forEach(m => {
    parts.push(`<rect x="${m.left}" y="${m.top}" width="${m.width}" height="${m.height}" fill="#FBFBF9" stroke="#E9EAE5" stroke-width="0.5"/>`);
    parts.push(`<text x="${m.left + 6}" y="${m.top + 13}" font-family="system-ui, sans-serif" font-size="9" font-weight="600" fill="#555851">${escapeXml(m.label)}</text>`);
  });

  // 周刻度
  layout.axis.weeks.forEach(w => {
    parts.push(`<text x="${w.left + 2}" y="${w.top + 12}" font-family="system-ui, sans-serif" font-size="8" fill="#969990">${escapeXml(w.label)}</text>`);
  });

  // 泳道行
  layout.lanes.forEach(lane => {
    parts.push(`<rect x="${lane.rect.left}" y="${lane.rect.top}" width="${lane.rect.width}" height="${lane.rect.height}" fill="${lane.backgroundColor}" stroke="${lane.borderColor}" stroke-width="0.75"/>`);
    parts.push(`<text x="${lane.labelRect.left + 4}" y="${lane.labelRect.top + 16}" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#3D5945">${escapeXml(lane.icon)} ${escapeXml(lane.name)}</text>`);
    if (lane.subtitle) {
      parts.push(`<text x="${lane.labelRect.left + 4}" y="${lane.labelRect.top + 30}" font-family="system-ui, sans-serif" font-size="8" fill="#858780">${escapeXml(lane.subtitle)}</text>`);
    }
  });

  // 普通任务条
  layout.tasks.forEach(t => {
    parts.push(`<rect x="${t.rect.left}" y="${t.rect.top}" width="${t.rect.width}" height="${t.rect.height}" rx="4" fill="${t.rect.fillColor}" stroke="${t.rect.lineColor}" stroke-width="1"/>`);
    parts.push(`<text x="${t.rect.left + 6}" y="${t.rect.top + (t.rect.height / 2) + 3}" font-family="system-ui, sans-serif" font-size="${t.text.fontSize}" fill="${t.text.fontColor}">${escapeXml(t.displayTitle)}</text>`);
  });

  // 菱形里程碑
  layout.milestones.forEach(ms => {
    const cx = ms.diamond.left + ms.diamond.width / 2;
    const cy = ms.diamond.top + ms.diamond.height / 2;
    const half = ms.diamond.width / 2;
    const points = `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;
    parts.push(`<polygon points="${points}" fill="${ms.diamond.fillColor}"/>`);
    parts.push(`<text x="${ms.label.left}" y="${cy + 3}" font-family="system-ui, sans-serif" font-size="${ms.label.fontSize}" font-weight="bold" fill="${ms.label.fontColor}">${escapeXml(ms.label.text)}</text>`);
  });

  parts.push('</svg>');
  container.innerHTML = parts.join('');
}
