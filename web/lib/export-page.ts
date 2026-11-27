import { displayPageTitle, isGhostTitle } from "@/lib/page-title";

export type ExportMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type ExportNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ExportNode[];
  text?: string;
  marks?: ExportMark[];
};

const ATOMS = new Set([
  "image",
  "video",
  "youtube",
  "horizontalRule",
  "bookmark",
  "mermaid",
  "toc",
  "blockMath",
  "inlineMath",
]);

export function pageIsEmpty(doc: ExportNode) {
  let empty = true;
  const walk = (node: ExportNode) => {
    if (!empty) return;
    if (node.text?.trim()) empty = false;
    if (ATOMS.has(node.type)) empty = false;
    node.content?.forEach(walk);
  };
  walk(doc);
  return empty;
}

export function exportFileName(title: string, extension: string) {
  const cleaned = displayPageTitle(title)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${cleaned || "Page"}.${extension}`;
}

function safeUrl(value: unknown) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || /[\u0000-\u001f]/.test(trimmed)) return "";
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) return trimmed;
  if (/^data:video\/[a-z0-9.+-]+;base64,/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return trimmed;
    }
  } catch {
    return "";
  }
  return "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_[\]|])/g, "\\$1");
}

function cssColor(value: unknown) {
  const color = String(value ?? "").trim();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return color;
  if (/^(?:rgb|hsl)a?\([\d\s,%.]+\)$/i.test(color)) return color;
  return "";
}

function percent(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 20 || number > 100) return null;
  return Math.round(number);
}

function attr(node: ExportNode, name: string) {
  return node.attrs?.[name];
}

function inlineText(nodes: ExportNode[] | undefined) {
  return (nodes ?? []).map(renderInline).join("");
}

function renderInline(node: ExportNode): string {
  if (node.type === "hardBreak") return "  \n";
  if (node.type === "inlineMath") {
    const latex = String(attr(node, "latex") ?? "").trim();
    return latex ? `$${latex.replace(/\$/g, "\\$")}$` : "";
  }
  if (node.type !== "text") return inlineText(node.content);
  const marks = node.marks ?? [];
  const raw = node.text ?? "";
  if (marks.some((mark) => mark.type === "code")) {
    const fence = "`".repeat(Math.max(1, longestRun(raw, "`") + 1));
    return `${fence}${raw}${fence}`;
  }
  let text = escapeMarkdown(raw);
  const bold = marks.some((mark) => mark.type === "bold");
  const italic = marks.some((mark) => mark.type === "italic");
  if (bold && italic) text = `***${text}***`;
  else if (bold) text = `**${text}**`;
  else if (italic) text = `*${text}*`;
  if (marks.some((mark) => mark.type === "strike")) text = `~~${text}~~`;
  if (marks.some((mark) => mark.type === "underline")) text = `<u>${text}</u>`;
  if (marks.some((mark) => mark.type === "highlight")) text = `==${text}==`;
  const link = marks.find((mark) => mark.type === "link");
  const href = safeUrl(link?.attrs?.href);
  if (href) text = `[${text}](${href})`;
  return text;
}

function longestRun(value: string, token: string) {
  let longest = 0;
  let count = 0;
  for (const char of value) {
    if (char === token) {
      count += 1;
      longest = Math.max(longest, count);
    } else {
      count = 0;
    }
  }
  return longest;
}

function plain(node: ExportNode): string {
  if (node.text) return node.text;
  if (node.type === "hardBreak") return "\n";
  if (node.type === "inlineMath") return String(attr(node, "latex") ?? "");
  return (node.content ?? []).map(plain).join("");
}

function renderBlock(node: ExportNode): string {
  switch (node.type) {
    case "doc":
      return renderBlocks(node.content);
    case "paragraph":
      return inlineText(node.content);
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(attr(node, "level")) || 1));
      return `${"#".repeat(level)} ${inlineText(node.content)}`.trimEnd();
    }
    case "bulletList":
    case "orderedList":
    case "taskList":
      return renderList(node);
    case "blockquote":
      return quote(renderBlocks(node.content));
    case "codeBlock":
      return fenced(plain(node), String(attr(node, "language") ?? ""));
    case "horizontalRule":
      return "---";
    case "image":
      return markdownImage(node);
    case "youtube":
      return markdownLink("YouTube", youtubeUrl(String(attr(node, "src") ?? "")));
    case "video": {
      const src = safeUrl(attr(node, "src"));
      if (!src || src.startsWith("data:")) return "Video";
      return markdownLink("Video", src);
    }
    case "callout":
      return quote(`${String(attr(node, "emoji") || "💡")} ${renderBlocks(node.content)}`.trim());
    case "toggle":
      return renderToggle(node);
    case "bookmark":
      return markdownLink(
        String(attr(node, "title") || attr(node, "href") || "Bookmark"),
        safeUrl(attr(node, "href")),
      );
    case "mermaid":
      return fenced(String(attr(node, "source") ?? ""), "mermaid");
    case "blockMath": {
      const latex = String(attr(node, "latex") ?? "").trim();
      return latex ? `$$\n${latex}\n$$` : "";
    }
    case "toc":
      return renderToc(node);
    case "table":
      return renderTable(node);
    default:
      return renderBlocks(node.content);
  }
}

function renderBlocks(nodes: ExportNode[] | undefined) {
  return (nodes ?? [])
    .map(renderBlock)
    .filter((part) => part.trim())
    .join("\n\n");
}

function quote(value: string) {
  return value
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function fenced(code: string, language: string) {
  const lang = /^[\w+-]+$/.test(language) && language !== "plaintext" ? language : "";
  const fence = "`".repeat(Math.max(3, longestRun(code, "`") + 1));
  return `${fence}${lang}\n${code.replace(/\n$/, "")}\n${fence}`;
}

function markdownImage(node: ExportNode) {
  const src = safeUrl(attr(node, "src"));
  if (!src) return "";
  const alt = String(attr(node, "alt") ?? "").replace(/[\[\]]/g, "");
  if (/[()\s]/.test(src)) {
    return `<img alt="${escapeHtml(alt)}" src="${escapeHtml(src)}">`;
  }
  return `![${alt}](${src})`;
}

function markdownLink(label: string, href: string) {
  if (!href) return label;
  return `[${escapeMarkdown(label)}](${href})`;
}

function youtubeUrl(src: string) {
  const safe = safeUrl(src);
  if (safe) return safe;
  if (/^[\w-]{6,}$/.test(src)) return `https://www.youtube.com/watch?v=${src}`;
  return "";
}

function renderList(node: ExportNode) {
  const ordered = node.type === "orderedList";
  const task = node.type === "taskList";
  const start = Number(attr(node, "start")) || 1;
  return (node.content ?? [])
    .map((item, index) => renderListItem(item, ordered, task, start + index))
    .join("\n");
}

function renderListItem(item: ExportNode, ordered: boolean, task: boolean, number: number) {
  const marker = task
    ? `- [${item.attrs?.checked ? "x" : " "}]`
    : ordered
      ? `${number}.`
      : "-";
  const lines: string[] = [];
  (item.content ?? []).forEach((child, index) => {
    const rendered = renderBlock(child);
    const childLines = rendered.split("\n");
    childLines.forEach((line, lineIndex) => {
      if (index === 0 && lineIndex === 0) lines.push(`${marker} ${line}`.trimEnd());
      else lines.push(line ? `  ${line}` : "");
    });
  });
  return lines.join("\n");
}

function renderToggle(node: ExportNode) {
  const children = node.content ?? [];
  const summary = escapeHtml(
    (children[0] ? plain(children[0]) : "Toggle").replace(/\s+/g, " ").trim() || "Toggle",
  );
  const body = renderBlocks(children.slice(1));
  return `<details>\n<summary>${summary || "Toggle"}</summary>\n\n${body}\n\n</details>`;
}

function collectHeadings(node: ExportNode, into: { level: number; text: string }[]) {
  if (node.type === "heading") {
    const text = plain(node).trim();
    if (text) into.push({ level: Number(attr(node, "level")) || 1, text });
  }
  if (node.type !== "toc") node.content?.forEach((child) => collectHeadings(child, into));
}

let headingSource: ExportNode | null = null;

function renderToc(node: ExportNode) {
  const headings: { level: number; text: string }[] = [];
  if (headingSource) collectHeadings(headingSource, headings);
  if (headings.length === 0) return plain(node).trim();
  return headings
    .map((heading) => `${"  ".repeat(Math.max(0, heading.level - 1))}- ${heading.text}`)
    .join("\n");
}

function renderTable(node: ExportNode) {
  const rows = (node.content ?? []).filter((row) => row.type === "tableRow");
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((row) => row.content?.length ?? 0));
  const lines = rows.map((row) => {
    const cells = (row.content ?? []).map(cellMarkdown);
    while (cells.length < width) cells.push(" ");
    return `| ${cells.join(" | ")} |`;
  });
  const rule = `| ${Array.from({ length: width }, () => "---").join(" | ")} |`;
  return [lines[0], rule, ...lines.slice(1)].join("\n");
}

function cellMarkdown(cell: ExportNode) {
  const text = (cell.content ?? [])
    .map((block) => renderBlock(block).replace(/\n+/g, " "))
    .join(" ")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();
  return text || " ";
}

export function pageToMarkdown(doc: ExportNode, title: string) {
  headingSource = doc;
  try {
    const body = renderBlocks(doc.type === "doc" ? doc.content : [doc]);
    if (isGhostTitle(title)) return `${body}\n`;
    return `# ${displayPageTitle(title)}\n\n${body}\n`;
  } finally {
    headingSource = null;
  }
}

async function htmlInlines(nodes: ExportNode[] | undefined) {
  const parts: string[] = [];
  for (const node of nodes ?? []) parts.push(await htmlInline(node));
  return parts.join("");
}

async function htmlInline(node: ExportNode): Promise<string> {
  if (node.type === "hardBreak") return "<br>";
  if (node.type === "inlineMath") return renderMath(String(attr(node, "latex") ?? ""), false);
  if (node.type !== "text") return htmlInlines(node.content);
  let text = escapeHtml(node.text ?? "");
  for (const mark of node.marks ?? []) {
    if (mark.type === "code") text = `<code>${text}</code>`;
    else if (mark.type === "bold") text = `<strong>${text}</strong>`;
    else if (mark.type === "italic") text = `<em>${text}</em>`;
    else if (mark.type === "strike") text = `<s>${text}</s>`;
    else if (mark.type === "underline") text = `<u>${text}</u>`;
    else if (mark.type === "highlight") {
      const color = cssColor(mark.attrs?.color);
      const markStyle = color ? ` style="background:${color}"` : "";
      text = `<mark${markStyle}>${text}</mark>`;
    } else if (mark.type === "link") {
      const href = safeUrl(mark.attrs?.href);
      if (href) text = `<a href="${escapeHtml(href)}">${text}</a>`;
    }
  }
  return text;
}

function mathHtml(latex: string, display: boolean) {
  const source = latex.trim();
  if (!source) return "";
  return display
    ? `<div class="math" data-latex="${escapeHtml(source)}">$$${escapeHtml(source)}$$</div>`
    : `<span class="math" data-latex="${escapeHtml(source)}">$${escapeHtml(source)}$</span>`;
}

async function renderMath(latex: string, display: boolean) {
  const source = latex.trim();
  if (!source) return "";
  try {
    const katex = (await import("katex")).default;
    return katex.renderToString(source, {
      throwOnError: false,
      displayMode: display,
      output: "html",
    });
  } catch {
    return mathHtml(source, display);
  }
}

async function renderDiagram(source: string) {
  const trimmed = source.trim();
  if (!trimmed) return "";
  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
      fontFamily: "Georgia, serif",
    });
    const id = `export-${Math.random().toString(36).slice(2, 10)}`;
    const rendered = await mermaid.render(id, trimmed);
    return rendered.svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  } catch {
    return `<pre class="code">${escapeHtml(trimmed)}</pre>`;
  }
}

async function htmlBlock(node: ExportNode): Promise<string> {
  switch (node.type) {
    case "paragraph": {
      const inner = await htmlInlines(node.content);
      return inner.trim() ? `<p>${inner}</p>` : "";
    }
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(attr(node, "level")) || 1));
      const text = await htmlInlines(node.content);
      return `<h${level} id="${slug(plain(node))}">${text}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${await htmlChildren(node.content)}</ul>`;
    case "orderedList": {
      const start = Number(attr(node, "start")) || 1;
      const startAttr = start === 1 ? "" : ` start="${start}"`;
      const items = await htmlChildren(node.content);
      return `<ol${startAttr}>${items}</ol>`;
    }
    case "taskList":
      return `<ul class="tasks">${await htmlChildren(node.content)}</ul>`;
    case "listItem":
      return `<li>${await htmlChildren(node.content)}</li>`;
    case "taskItem": {
      const checked = Boolean(attr(node, "checked"));
      return `<li class="task${checked ? " done" : ""}"><span class="box">${checked ? "✓" : ""}</span><div>${await htmlChildren(node.content)}</div></li>`;
    }
    case "blockquote":
      return `<blockquote>${await htmlChildren(node.content)}</blockquote>`;
    case "codeBlock": {
      const language = String(attr(node, "language") ?? "");
      const label =
        language && language !== "plaintext"
          ? `<span class="lang">${escapeHtml(language)}</span>`
          : "";
      return `<pre class="code">${label}<code>${escapeHtml(plain(node))}</code></pre>`;
    }
    case "horizontalRule":
      return "<hr>";
    case "image":
      return htmlImage(node);
    case "youtube": {
      const href = youtubeUrl(String(attr(node, "src") ?? ""));
      return href
        ? `<p class="link-card"><a href="${escapeHtml(href)}">YouTube</a></p>`
        : "";
    }
    case "video": {
      const src = safeUrl(attr(node, "src"));
      if (!src) return "";
      const width = percent(attr(node, "width"));
      const widthStyle = width ? ` style="width:${width}%"` : "";
      return `<video controls src="${escapeHtml(src)}"${widthStyle}>Video</video>`;
    }
    case "callout":
      return `<aside class="callout"><span class="emoji">${escapeHtml(String(attr(node, "emoji") || "💡"))}</span><div>${await htmlChildren(node.content)}</div></aside>`;
    case "toggle": {
      const children = node.content ?? [];
      const summary = children[0] ? await htmlBlock(children[0]) : "<p>Toggle</p>";
      const rest = await htmlChildren(children.slice(1));
      const open = attr(node, "open") !== false;
      return `<details class="toggle"${open ? " open" : ""}><summary>${summary}</summary>${rest}</details>`;
    }
    case "bookmark": {
      const href = safeUrl(attr(node, "href"));
      const title = escapeHtml(String(attr(node, "title") || href || "Bookmark"));
      if (!href) return `<p>${title}</p>`;
      let host = href;
      try {
        host = new URL(href).host;
      } catch {
        host = href;
      }
      return `<a class="bookmark" href="${escapeHtml(href)}"><strong>${title}</strong><span>${escapeHtml(host)}</span></a>`;
    }
    case "mermaid":
      return `<figure class="diagram">${await renderDiagram(String(attr(node, "source") ?? ""))}</figure>`;
    case "blockMath":
      return `<figure class="math-block">${await renderMath(String(attr(node, "latex") ?? ""), true)}</figure>`;
    case "toc":
      return htmlToc();
    case "table":
      return htmlTable(node);
    default:
      return htmlChildren(node.content);
  }
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function htmlChildren(nodes: ExportNode[] | undefined) {
  const parts: string[] = [];
  for (const node of nodes ?? []) parts.push(await htmlBlock(node));
  return parts.join("");
}

function htmlImage(node: ExportNode) {
  const src = safeUrl(attr(node, "src"));
  if (!src) return "";
  const alt = escapeHtml(String(attr(node, "alt") ?? ""));
  const width = percent(attr(node, "width"));
  const widthStyle = width ? ` style="width:${width}%"` : "";
  return `<figure class="media"${widthStyle}><img alt="${alt}" src="${escapeHtml(src)}"></figure>`;
}

function htmlToc() {
  const headings: { level: number; text: string }[] = [];
  if (headingSource) collectHeadings(headingSource, headings);
  if (headings.length === 0) return "";
  const items = headings
    .map(
      (heading) =>
        `<li style="margin-left:${(heading.level - 1) * 16}px"><a href="#${slug(heading.text)}">${escapeHtml(heading.text)}</a></li>`,
    )
    .join("");
  return `<nav class="toc"><p>On this page</p><ul>${items}</ul></nav>`;
}

async function htmlTable(node: ExportNode) {
  const rows = node.content ?? [];
  const body: string[] = [];
  for (const row of rows) {
    const cells: string[] = [];
    for (const cell of row.content ?? []) {
      const tag = cell.type === "tableHeader" ? "th" : "td";
      const span = Number(attr(cell, "colspan"));
      const background = cssColor(attr(cell, "backgroundColor") ?? attr(cell, "background"));
      const color = cssColor(attr(cell, "color"));
      const style = [
        background ? `background:${background}` : "",
        color ? `color:${color}` : "",
      ]
        .filter(Boolean)
        .join(";");
      const spanAttr = span > 1 ? ` colspan="${span}"` : "";
      const styleAttr = style ? ` style="${style}"` : "";
      const inner = await htmlChildren(cell.content);
      cells.push(`<${tag}${spanAttr}${styleAttr}>${inner}</${tag}>`);
    }
    body.push(`<tr>${cells.join("")}</tr>`);
  }
  return `<table>${body.join("")}</table>`;
}

const DOCUMENT_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: #1c1c1c; font: 16px/1.6 Georgia, "Iowan Old Style", Palatino, serif; }
article { max-width: 720px; margin: 0 auto; padding: 56px 28px 72px; }
header h1 { margin: 0 0 28px; font-size: 40px; line-height: 1.15; letter-spacing: -0.03em; }
.emoji { margin: 0 0 12px; font: 48px/1 sans-serif; }
h1, h2, h3, h4, h5, h6 { line-height: 1.25; letter-spacing: -0.02em; margin: 1.4em 0 0.4em; }
h1 { font-size: 32px; } h2 { font-size: 24px; } h3 { font-size: 20px; }
p { margin: 0.4em 0; }
a { color: #1d4ed8; }
ul, ol { margin: 0.4em 0; padding-left: 1.4em; }
li { margin: 0.15em 0; }
ul.tasks { list-style: none; padding-left: 0; }
ul.tasks > li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 8px; }
.box { width: 16px; height: 16px; margin-top: 4px; border: 1.5px solid #b5b5b5; border-radius: 4px; font: 12px/16px sans-serif; text-align: center; }
.task.done .box { background: #2383e2; border-color: #2383e2; color: #fff; }
blockquote { margin: 0.8em 0; padding-left: 14px; border-left: 3px solid #d8d8d8; color: #444; }
pre.code { position: relative; margin: 0.8em 0; padding: 12px 16px; overflow: auto; border-radius: 8px; background: #f6f5f4; font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; }
.lang { position: absolute; top: 8px; right: 10px; color: #888; font-size: 11px; text-transform: uppercase; }
code { font: 0.92em/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
p code, li code { padding: 0 0.25em; border-radius: 4px; background: #f3f3f1; }
hr { margin: 1.4em 0; border: 0; border-top: 1px solid #e6e6e6; }
img, video, svg { max-width: 100%; height: auto; }
figure.media, video { margin: 0.8em 0; }
figure.diagram { margin: 1em 0; overflow: auto; }
aside.callout { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; margin: 0.8em 0; padding: 12px 14px; border-radius: 8px; background: #f7f6f3; }
details.toggle { margin: 0.6em 0; }
details.toggle summary { cursor: pointer; }
a.bookmark { display: block; margin: 0.8em 0; padding: 12px 14px; border: 1px solid #ececec; border-radius: 8px; color: inherit; text-decoration: none; }
a.bookmark span { display: block; color: #777; font-size: 13px; }
nav.toc { margin: 0.8em 0 1.2em; padding: 12px 14px; border-radius: 8px; background: #fafafa; }
nav.toc p { margin: 0 0 6px; color: #777; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
nav.toc ul { list-style: none; padding: 0; }
table { width: 100%; margin: 0.8em 0; border-collapse: collapse; font-size: 15px; }
th, td { padding: 8px 10px; border: 1px solid #e6e6e6; vertical-align: top; text-align: left; }
th { background: #f7f7f5; }
.math-block { margin: 0.8em 0; overflow: auto; }
mark { padding: 0 0.15em; border-radius: 3px; background: #fde68a; }
@page { margin: 16mm 16mm 18mm; }
@media print {
  article { max-width: none; padding: 0; }
  a { text-decoration: none; }
  pre.code, table, figure, aside, blockquote, img { break-inside: avoid; }
}
`;

export async function pageToHtml(
  doc: ExportNode,
  title: string,
  options?: { emoji?: string | null; extraCss?: string },
) {
  headingSource = doc;
  try {
    const body = await htmlChildren(doc.type === "doc" ? doc.content : [doc]);
    const name = isGhostTitle(title) ? "Page" : displayPageTitle(title);
    const emoji = options?.emoji?.trim()
      ? `<p class="emoji">${escapeHtml(options.emoji.trim())}</p>`
      : "";
    const heading = isGhostTitle(title) ? "" : `<h1>${escapeHtml(name)}</h1>`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.18.10/dist/katex.min.css">
<style>${DOCUMENT_CSS}
${options?.extraCss ?? ""}</style>
</head>
<body>
<article>
<header>${emoji}${heading}</header>
${body}
</article>
</body>
</html>`;
  } finally {
    headingSource = null;
  }
}

export function katexCssFromDocument() {
  if (typeof document === "undefined") return "";
  const chunks: string[] = [];
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (rule.cssText.includes(".katex")) chunks.push(rule.cssText);
    }
  }
  return chunks.join("\n");
}

export function downloadText(filename: string, mime: string, body: string) {
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openPrintWindow() {
  const child = window.open("", "_blank");
  if (!child) return null;
  child.document.open();
  child.document.write(
    `<!DOCTYPE html><title>Preparing PDF…</title><body style="margin:0;padding:48px;font:15px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#37352f"><p>Preparing your PDF…</p></body>`,
  );
  child.document.close();
  return child;
}

export async function printHtml(child: Window, html: string) {
  child.document.open();
  child.document.write(html);
  child.document.close();
  const images = [...child.document.images];
  await Promise.race([
    Promise.all(images.map((image) => image.decode().catch(() => undefined))),
    new Promise((resolve) => window.setTimeout(resolve, 4000)),
  ]);
  child.focus();
  child.print();
  child.addEventListener("afterprint", () => child.close());
}
