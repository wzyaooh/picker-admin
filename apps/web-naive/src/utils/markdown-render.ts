/**
 * Markdown 渲染工具：支持 Mermaid 图表自动渲染
 *
 * 将 markdown 中的 ```mermaid 代码块转换为可渲染的 <div>，
 * 然后在 DOM 挂载后调用 mermaid.run() 渲染为 SVG。
 */
import { marked } from 'marked';
import mermaid from 'mermaid';

let mermaidInitialized = false;
let mermaidCounter = 0;

/**
 * 初始化 mermaid（仅执行一次）
 */
function ensureMermaidInit(isDark = false) {
  const theme = isDark ? 'dark' : 'default';
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: 'loose',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });
    mermaidInitialized = true;
  } else {
    // 切换主题时重新配置
    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: 'loose',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });
  }
}

/**
 * 将 Markdown 渲染为 HTML，mermaid 代码块转为占位 div
 */
export function renderMarkdown(content: string, isDark = false): string {
  if (!content) return '';

  ensureMermaidInit(isDark);

  // 先将 mermaid 代码块替换为占位符，避免 marked 转义
  const mermaidBlocks: string[] = [];
  const placeholder = '___MERMAID_PLACEHOLDER___';

  const processed = content.replace(
    /```mermaid\s*\n([\s\S]*?)```/g,
    (_match, code: string) => {
      const idx = mermaidBlocks.length;
      mermaidBlocks.push(code.trim());
      return `${placeholder}${idx}${placeholder}`;
    },
  );

  // 渲染 markdown
  let html = marked.parse(processed, { breaks: true }) as string;

  // 替换占位符为 mermaid div
  for (let i = 0; i < mermaidBlocks.length; i++) {
    const id = `mermaid-${Date.now()}-${mermaidCounter++}`;
    const mermaidDiv = `<div class="mermaid-wrapper"><pre class="mermaid" id="${id}">${escapeHtml(mermaidBlocks[i]!)}</pre></div>`;
    html = html.replace(`${placeholder}${i}${placeholder}`, mermaidDiv);
    // marked 可能把占位符包在 <p> 里
    html = html.replace(
      `<p>${placeholder}${i}${placeholder}</p>`,
      mermaidDiv,
    );
  }

  return html;
}

/**
 * 在 DOM 更新后调用，渲染页面中所有未渲染的 mermaid 图表
 */
export async function renderMermaidCharts(
  container?: HTMLElement,
): Promise<void> {
  const root = container || document;
  const elements = root.querySelectorAll('pre.mermaid:not([data-processed])');
  if (elements.length === 0) return;

  try {
    await mermaid.run({ nodes: elements as NodeListOf<HTMLElement> });
  } catch (e) {
    // mermaid 语法错误时不要崩溃，显示原始代码
    console.warn('[Mermaid] 渲染失败:', e);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
