import type { Editor } from "@tiptap/core";
import { TableCell, TableHeader } from "@tiptap/extension-table";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { CellSelection, TableMap, moveTableRow } from "prosemirror-tables";

const SAFE_COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s,%.]+\))$/;

function isSafeColor(value: unknown): value is string {
  return typeof value === "string" && SAFE_COLOR.test(value.trim());
}

function paintAttributes() {
  return {
    backgroundColor: {
      default: null as string | null,
      parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
      renderHTML: (attributes: { backgroundColor?: string | null }) => {
        if (!isSafeColor(attributes.backgroundColor)) return {};
        return { style: `background-color: ${attributes.backgroundColor}` };
      },
    },
    color: {
      default: null as string | null,
      parseHTML: (element: HTMLElement) => element.style.color || null,
      renderHTML: (attributes: { color?: string | null }) => {
        if (!isSafeColor(attributes.color)) return {};
        return { style: `color: ${attributes.color}` };
      },
    },
  };
}

export const NotionTableCell = TableCell.extend({
  addAttributes() {
    return { ...(this.parent?.() ?? {}), ...paintAttributes() };
  },
});

export const NotionTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...(this.parent?.() ?? {}), ...paintAttributes() };
  },
});

export const TABLE_TEXT_COLORS = [
  { name: "Default", value: null },
  { name: "Gray", value: "#787774" },
  { name: "Brown", value: "#9f6b53" },
  { name: "Orange", value: "#d9730d" },
  { name: "Yellow", value: "#cb912f" },
  { name: "Green", value: "#448361" },
  { name: "Blue", value: "#337ea9" },
  { name: "Purple", value: "#9065b0" },
  { name: "Pink", value: "#c14c8a" },
  { name: "Red", value: "#d44c47" },
] as const;

export const TABLE_BACKGROUND_COLORS = [
  { name: "Default", value: null },
  { name: "Gray", value: "#f1f1ef" },
  { name: "Brown", value: "#f4eeee" },
  { name: "Orange", value: "#fbecdd" },
  { name: "Yellow", value: "#fbf3db" },
  { name: "Green", value: "#edf3ec" },
  { name: "Blue", value: "#e7f3f8" },
  { name: "Purple", value: "#f6f3f9" },
  { name: "Pink", value: "#faf1f5" },
  { name: "Red", value: "#fdebec" },
] as const;

export function findTable(editor: Editor) {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "table") {
      return { node, pos: $from.before(depth) };
    }
  }
  return null;
}

export function tableHeaderState(table: ProseNode) {
  const first = table.firstChild;
  let headerRow = !!first && first.childCount > 0;
  first?.forEach((cell) => {
    if (cell.type.name !== "tableHeader") headerRow = false;
  });
  let headerColumn = table.childCount > 0;
  table.forEach((row) => {
    if (row.firstChild?.type.name !== "tableHeader") headerColumn = false;
  });
  return { headerRow, headerColumn };
}

export function fitTableToWidth(editor: Editor) {
  const found = findTable(editor);
  if (!found) return;
  const tr = editor.state.tr;
  found.node.descendants((node, pos) => {
    if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") return;
    if (node.attrs.colwidth) {
      tr.setNodeMarkup(found.pos + 1 + pos, undefined, { ...node.attrs, colwidth: null });
    }
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

export function duplicateTable(editor: Editor) {
  const found = findTable(editor);
  if (!found) return;
  editor
    .chain()
    .focus()
    .insertContentAt(found.pos + found.node.nodeSize, found.node.toJSON())
    .run();
}

export function clearTableCells(editor: Editor) {
  const { state } = editor;
  const { selection } = state;
  const paragraph = state.schema.nodes.paragraph;
  if (!paragraph) return;
  const cells: { pos: number; node: ProseNode }[] = [];
  if (selection instanceof CellSelection) {
    selection.forEachCell((node, pos) => cells.push({ node, pos }));
  } else {
    const { $from } = selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        cells.push({ node, pos: $from.before(depth) });
        break;
      }
    }
  }
  if (cells.length === 0) return;
  const tr = state.tr;
  cells
    .sort((a, b) => b.pos - a.pos)
    .forEach((cell) => {
      tr.replaceWith(cell.pos + 1, cell.pos + cell.node.nodeSize - 1, paragraph.create());
    });
  editor.view.dispatch(tr);
}

export function paintCells(editor: Editor, name: "color" | "backgroundColor", value: string | null) {
  editor.chain().focus().setCellAttribute(name, value).run();
}

export function tablePosFromDom(editor: Editor, dom: HTMLElement) {
  let found: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found != null) return false;
    if (node.type.name !== "table") return;
    if (editor.view.nodeDOM(pos) === dom) found = pos;
  });
  return found;
}

export function cellDocumentPos(table: ProseNode, tablePos: number, row: number, col: number) {
  const map = TableMap.get(table);
  if (row < 0 || col < 0 || row >= map.height || col >= map.width) return null;
  return tablePos + 1 + map.positionAt(row, col, table);
}

export function rowIsHeader(table: ProseNode, rowIndex: number) {
  const row = table.child(rowIndex);
  if (!row || row.childCount === 0) return false;
  let header = true;
  row.forEach((cell) => {
    if (cell.type.name !== "tableHeader") header = false;
  });
  return header;
}

export function columnIsHeader(table: ProseNode, colIndex: number) {
  const map = TableMap.get(table);
  if (colIndex < 0 || colIndex >= map.width) return false;
  for (let row = 0; row < map.height; row += 1) {
    const cell = table.nodeAt(map.map[row * map.width + colIndex]);
    if (!cell || cell.type.name !== "tableHeader") return false;
  }
  return true;
}

function focusCell(editor: Editor, tablePos: number, row: number, col: number, selection: "text" | "row" | "column") {
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return false;
  const pos = cellDocumentPos(table, tablePos, row, col);
  if (pos == null) return false;
  const $cell = editor.state.doc.resolve(pos);
  const next =
    selection === "column"
      ? CellSelection.colSelection($cell)
      : selection === "row"
        ? CellSelection.rowSelection($cell)
        : TextSelection.near(editor.state.doc.resolve(pos + 1), 1);
  editor.view.dispatch(editor.state.tr.setSelection(next));
  return true;
}

export function selectColumn(editor: Editor, tablePos: number, col: number) {
  return focusCell(editor, tablePos, 0, col, "column");
}

export function selectRow(editor: Editor, tablePos: number, row: number) {
  return focusCell(editor, tablePos, row, 0, "row");
}

export function placeCursorInCell(editor: Editor, tablePos: number, row: number, col: number) {
  return focusCell(editor, tablePos, row, col, "text");
}

export function ensureTableCursor(editor: Editor, tablePos: number) {
  const found = findTable(editor);
  if (found?.pos === tablePos) return true;
  return placeCursorInCell(editor, tablePos, 0, 0);
}

function setCellTypes(editor: Editor, positions: number[], header: boolean) {
  const headerType = editor.schema.nodes.tableHeader;
  const cellType = editor.schema.nodes.tableCell;
  if (!headerType || !cellType) return;
  const type = header ? headerType : cellType;
  const tr = editor.state.tr;
  positions.forEach((pos) => {
    const cell = tr.doc.nodeAt(pos);
    if (!cell || (cell.type !== headerType && cell.type !== cellType) || cell.type === type) return;
    tr.setNodeMarkup(pos, type, cell.attrs);
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

function headerBesides(table: ProseNode, axis: "row" | "column", index: number, skip: number) {
  const map = TableMap.get(table);
  const length = axis === "row" ? map.width : map.height;
  let saw = false;
  for (let step = 0; step < length; step += 1) {
    if (step === skip) continue;
    const row = axis === "row" ? index : step;
    const col = axis === "row" ? step : index;
    const cell = table.nodeAt(map.map[row * map.width + col]);
    if (!cell) continue;
    saw = true;
    if (cell.type.name !== "tableHeader") return false;
  }
  return saw;
}

export function setRowHeader(editor: Editor, tablePos: number, rowIndex: number, on: boolean) {
  if (rowIndex !== 0) return;
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table || table.childCount === 0) return;
  const map = TableMap.get(table);
  const seen = new Set<number>();
  const positions: number[] = [];
  for (let col = 0; col < map.width; col += 1) {
    if (!on && headerBesides(table, "column", col, 0)) continue;
    const rel = map.map[col];
    if (seen.has(rel)) continue;
    seen.add(rel);
    positions.push(tablePos + 1 + rel);
  }
  setCellTypes(editor, positions, on);
}

export function setColumnHeader(editor: Editor, tablePos: number, colIndex: number, on: boolean) {
  if (colIndex !== 0) return;
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;
  const map = TableMap.get(table);
  const seen = new Set<number>();
  const positions: number[] = [];
  for (let row = 0; row < map.height; row += 1) {
    if (!on && headerBesides(table, "row", row, 0)) continue;
    const rel = map.map[row * map.width];
    if (seen.has(rel)) continue;
    seen.add(rel);
    positions.push(tablePos + 1 + rel);
  }
  setCellTypes(editor, positions, on);
}

function clonedCell(cell: ProseNode) {
  const widths = cell.attrs.colwidth;
  const colwidth = Array.isArray(widths) && widths.length ? [widths[0]] : null;
  return cell.type.create({ ...cell.attrs, colspan: 1, rowspan: 1, colwidth }, cell.content);
}

export function duplicateColumnAt(editor: Editor, tablePos: number, colIndex: number) {
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;
  const map = TableMap.get(table);
  if (colIndex < 0 || colIndex >= map.width) return;
  const rows: ProseNode[] = [];
  for (let rowIndex = 0; rowIndex < table.childCount; rowIndex += 1) {
    const row = table.child(rowIndex);
    let rowStart = 0;
    for (let index = 0; index < rowIndex; index += 1) rowStart += table.child(index).nodeSize;
    const target = map.positionAt(rowIndex, colIndex, table);
    const cells: ProseNode[] = [];
    let cursor = rowStart + 1;
    let inserted = false;
    row.forEach((child) => {
      cells.push(child);
      if (!inserted && cursor === target) {
        cells.push(clonedCell(child));
        inserted = true;
      }
      cursor += child.nodeSize;
    });
    if (!inserted) {
      const sample = row.firstChild ?? table.firstChild?.firstChild;
      const blank = sample?.type.createAndFill({
        colspan: 1,
        rowspan: 1,
        colwidth: null,
        backgroundColor: null,
        color: null,
      });
      if (blank) cells.push(blank);
    }
    rows.push(row.type.create(row.attrs, cells));
  }
  replaceTable(editor, tablePos, table, rows);
}

export function duplicateRowAt(editor: Editor, tablePos: number, rowIndex: number) {
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table || rowIndex < 0 || rowIndex >= table.childCount) return;
  const rows: ProseNode[] = [];
  table.forEach((row, _offset, index) => {
    rows.push(row);
    if (index === rowIndex) rows.push(row.type.create(row.attrs, row.content));
  });
  replaceTable(editor, tablePos, table, rows);
}

function replaceTable(editor: Editor, tablePos: number, table: ProseNode, rows: ProseNode[]) {
  const next = table.type.create(table.attrs, rows);
  editor.view.dispatch(editor.state.tr.replaceWith(tablePos, tablePos + table.nodeSize, next));
}

export function adjustColumns(editor: Editor, tablePos: number, delta: number) {
  const capped = Math.max(-20, Math.min(20, delta));
  if (capped === 0) return;
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;
  const map = TableMap.get(table);
  if (capped > 0) {
    if (!placeCursorInCell(editor, tablePos, map.height - 1, map.width - 1)) return;
    for (let index = 0; index < capped; index += 1) {
      if (!editor.chain().focus().addColumnAfter().run()) break;
    }
    return;
  }
  const remove = Math.min(-capped, map.width - 1);
  for (let index = 0; index < remove; index += 1) {
    const current = editor.state.doc.nodeAt(tablePos);
    if (!current) return;
    const width = TableMap.get(current).width;
    if (width <= 1) return;
    if (!placeCursorInCell(editor, tablePos, current.childCount - 1, width - 1)) return;
    if (!editor.chain().focus().deleteColumn().run()) break;
  }
}

export function adjustRows(editor: Editor, tablePos: number, delta: number) {
  const capped = Math.max(-20, Math.min(20, delta));
  if (capped === 0) return;
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;
  const map = TableMap.get(table);
  if (capped > 0) {
    if (!placeCursorInCell(editor, tablePos, map.height - 1, 0)) return;
    for (let index = 0; index < capped; index += 1) {
      if (!editor.chain().focus().addRowAfter().run()) break;
    }
    return;
  }
  const remove = Math.min(-capped, map.height - 1);
  for (let index = 0; index < remove; index += 1) {
    const current = editor.state.doc.nodeAt(tablePos);
    if (!current || current.childCount <= 1) return;
    if (!placeCursorInCell(editor, tablePos, current.childCount - 1, 0)) return;
    if (!editor.chain().focus().deleteRow().run()) break;
  }
}

export function reorderRow(editor: Editor, tablePos: number, from: number, to: number) {
  if (from === to) return false;
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table || from < 0 || to < 0 || from >= table.childCount || to >= table.childCount) return false;
  if (!selectRow(editor, tablePos, from)) return false;
  const pos = cellDocumentPos(table, tablePos, from, 0);
  if (pos == null) return false;
  return moveTableRow({ from, to, pos })(editor.state, editor.view.dispatch);
}
