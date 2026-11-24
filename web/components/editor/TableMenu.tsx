"use client";

import type { Editor } from "@tiptap/core";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Copy,
  Eraser,
  GripVertical,
  Palette,
  Plus,
  Trash2,
  UnfoldHorizontal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CellSelection } from "prosemirror-tables";

import { cn } from "@/lib/utils";
import {
  TABLE_BACKGROUND_COLORS,
  TABLE_TEXT_COLORS,
  adjustColumns,
  adjustRows,
  clearTableCells,
  columnIsHeader,
  duplicateColumnAt,
  duplicateRowAt,
  duplicateTable,
  ensureTableCursor,
  findTable,
  fitTableToWidth,
  paintCells,
  reorderRow,
  rowIsHeader,
  selectColumn,
  selectRow,
  setColumnHeader,
  setRowHeader,
  tableHeaderState,
  tablePosFromDom,
} from "@/components/editor/table-nodes";

type Rect = { top: number; left: number; width: number; height: number };
type Geom = {
  tablePos: number;
  table: Rect;
  rows: Rect[];
  cols: Rect[];
};
type MenuState = { kind: "block" } | { kind: "row"; index: number } | { kind: "column"; index: number };
type Hover = { row: number | null; col: number | null };

const MENU_WIDTH = 240;

export function TableMenu({ editor, frame }: { editor: Editor; frame: HTMLElement | null }) {
  const [geom, setGeom] = useState<Geom | null>(null);
  const [shown, setShown] = useState(false);
  const [hover, setHover] = useState<Hover>({ row: null, col: null });
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [colors, setColors] = useState(false);
  const [tip, setTip] = useState<"column" | "row" | null>(null);
  const [edgePreview, setEdgePreview] = useState<{ axis: "column" | "row"; count: number; x: number; y: number } | null>(
    null,
  );
  const [rowDrag, setRowDrag] = useState<{ from: number; to: number; y: number } | null>(null);

  const geomRef = useRef<Geom | null>(null);
  const wrapperRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<MenuState | null>(null);
  const hoverRef = useRef<Hover>({ row: null, col: null });
  const draggingRef = useRef(false);
  const rowDragRef = useRef<typeof rowDrag>(null);
  const hideTimer = useRef<number | null>(null);
  const tipTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    menuRef.current = menu;
  }, [menu]);

  useEffect(() => {
    if (!frame) return;

    const publish = (next: Geom | null) => {
      geomRef.current = next;
      setGeom(next);
    };

    const measure = () => {
      let current = wrapperRef.current;
      if (current && !current.isConnected) {
        const pos = geomRef.current?.tablePos;
        const dom = pos == null ? null : editor.view.nodeDOM(pos);
        current = dom instanceof HTMLElement ? dom : null;
        wrapperRef.current = current;
      }
      if (!current) return;
      const next = measureTable(editor, frame, current);
      if (!next) {
        if (!current.isConnected && !menuRef.current) hideChrome();
        return;
      }
      publish(next);
    };

    const hideChrome = () => {
      wrapperRef.current = null;
      setShown(false);
      setHover({ row: null, col: null });
      hoverRef.current = { row: null, col: null };
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        if (!wrapperRef.current && !menuRef.current && !draggingRef.current) publish(null);
      }, 180);
    };

    const reveal = (wrapper: HTMLElement) => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (wrapperRef.current !== wrapper) {
        wrapperRef.current = wrapper;
        measure();
      }
      setShown(true);
    };

    const onMove = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-table-menu]")) return;
      const host = frame.getBoundingClientRect();
      const x = event.clientX - host.left;
      const y = event.clientY - host.top;
      const current = geomRef.current;
      if (current) {
        const nextHover = hitTest(current, x, y);
        if (nextHover.row !== hoverRef.current.row || nextHover.col !== hoverRef.current.col) {
          hoverRef.current = nextHover;
          setHover(nextHover);
        }
      }
      if (draggingRef.current || menuRef.current) return;
      if (target?.closest("[data-table-chrome]")) return;
      const wrapper = target?.closest(".tableWrapper");
      if (wrapper instanceof HTMLElement && frame.contains(wrapper)) {
        reveal(wrapper);
        return;
      }
      if (current && nearTable(current, x, y)) return;
      if (selectionWrapper(editor) && wrapperRef.current === selectionWrapper(editor)) return;
      if (wrapperRef.current) hideChrome();
    };

    editor.on("transaction", measure);
    editor.on("selectionUpdate", measure);
    const scroller = editor.view.dom.closest(".overflow-y-auto");
    scroller?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("mousemove", onMove);
    return () => {
      editor.off("transaction", measure);
      editor.off("selectionUpdate", measure);
      scroller?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("mousemove", onMove);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (tipTimer.current) window.clearTimeout(tipTimer.current);
    };
  }, [editor, frame]);

  useEffect(() => {
    if (!menu) return;
    const down = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-table-menu], [data-table-handle]")) return;
      setMenu(null);
      setColors(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenu(null);
      setColors(false);
    };
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key);
    };
  }, [menu]);

  if (!frame || !geom) return null;

  const tableNode = editor.state.doc.nodeAt(geom.tablePos);
  const activeRow = menu?.kind === "row" ? menu.index : (rowDrag?.from ?? hover.row);
  const activeCol = menu?.kind === "column" ? menu.index : hover.col;
  const host = frame.getBoundingClientRect();

  function openMenu(next: MenuState) {
    if (next.kind === "row") selectRow(editor, geom!.tablePos, next.index);
    if (next.kind === "column") selectColumn(editor, geom!.tablePos, next.index);
    if (next.kind === "block") ensureTableCursor(editor, geom!.tablePos);
    setMenu(next);
    setColors(false);
    setTip(null);
  }

  function run(action: (tablePos: number) => void, close = true) {
    const tablePos = geomRef.current?.tablePos;
    if (tablePos == null) return;
    action(tablePos);
    if (!close) return;
    setMenu(null);
    setColors(false);
  }

  function paint(name: "color" | "backgroundColor", value: string | null) {
    const tablePos = geomRef.current?.tablePos;
    const current = menuRef.current;
    if (tablePos == null || !current || current.kind === "block") return;
    if (current.kind === "row") selectRow(editor, tablePos, current.index);
    else selectColumn(editor, tablePos, current.index);
    paintCells(editor, name, value);
  }

  function showTip(next: "column" | "row") {
    if (tipTimer.current) window.clearTimeout(tipTimer.current);
    tipTimer.current = window.setTimeout(() => setTip(next), 380);
  }

  function hideTip() {
    if (tipTimer.current) window.clearTimeout(tipTimer.current);
    setTip(null);
  }

  function startEdge(event: React.PointerEvent, axis: "column" | "row") {
    event.preventDefault();
    event.stopPropagation();
    const current = geomRef.current;
    if (!current) return;
    draggingRef.current = true;
    hideTip();
    const start = axis === "column" ? event.clientX : event.clientY;
    const unit =
      axis === "column"
        ? Math.max(48, current.cols.reduce((sum, col) => sum + col.width, 0) / Math.max(1, current.cols.length))
        : Math.max(28, current.rows.reduce((sum, row) => sum + row.height, 0) / Math.max(1, current.rows.length));
    const tablePos = current.tablePos;
    let moved = false;
    let count = 0;
    const move = (pointer: PointerEvent) => {
      const delta = (axis === "column" ? pointer.clientX : pointer.clientY) - start;
      if (Math.abs(delta) > 3) moved = true;
      count = Math.round(delta / unit);
      setEdgePreview({ axis, count, x: pointer.clientX, y: pointer.clientY });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      draggingRef.current = false;
      setEdgePreview(null);
      const delta = moved ? Math.max(-20, Math.min(20, count)) : 1;
      if (delta === 0) return;
      if (axis === "column") adjustColumns(editor, tablePos, delta);
      else adjustRows(editor, tablePos, delta);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startRowDrag(event: React.PointerEvent, index: number) {
    event.preventDefault();
    event.stopPropagation();
    const tablePos = geomRef.current?.tablePos;
    if (tablePos == null) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    draggingRef.current = true;
    const move = (pointer: PointerEvent) => {
      if (!dragging && Math.hypot(pointer.clientX - startX, pointer.clientY - startY) > 4) {
        dragging = true;
        suppressClick.current = true;
        setMenu(null);
        setColors(false);
      }
      if (!dragging) return;
      const current = geomRef.current;
      if (!current || current.rows.length === 0) return;
      const top = frame!.getBoundingClientRect().top;
      const y = pointer.clientY - top;
      let target = current.rows.findIndex((row) => y >= row.top && y < row.top + row.height);
      if (target < 0) target = y < current.rows[0].top ? 0 : current.rows.length - 1;
      const next = { from: index, to: target, y: pointer.clientY };
      rowDragRef.current = next;
      setRowDrag(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      draggingRef.current = false;
      const target = rowDragRef.current;
      rowDragRef.current = null;
      setRowDrag(null);
      if (dragging && target) {
        reorderRow(editor, tablePos, target.from, target.to);
        return;
      }
      openMenu({ kind: "row", index });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const menuBox = menuPosition(menu, geom, host);
  const flipColors = menuBox != null && menuBox.left + MENU_WIDTH + 236 > window.innerWidth;

  return (
    <>
      <div data-table-chrome className={cn("table-chrome pointer-events-none absolute inset-0 z-20", !shown && "is-hidden")}>
        <button
          type="button"
          data-table-handle
          title="Table options"
          className="table-grip pointer-events-auto absolute flex size-6 cursor-pointer items-center justify-center rounded-md text-[#37352f]/55 hover:bg-[#efefef] hover:text-[#37352f]"
          style={{ left: geom.table.left - 46, top: geom.table.top + 2 }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (menu?.kind === "block") {
              setMenu(null);
              return;
            }
            openMenu({ kind: "block" });
          }}
        >
          <GripVertical className="size-4" />
        </button>

        {activeRow != null && geom.rows[activeRow] ? (
          <button
            type="button"
            data-table-handle
            title="Drag to move"
            className={cn(
              "table-grip pointer-events-auto absolute flex size-6 items-center justify-center rounded-md text-[#37352f]/55 hover:bg-[#efefef] hover:text-[#37352f]",
              rowDrag ? "cursor-grabbing" : "cursor-grab",
              menu?.kind === "row" && "bg-[#efefef] text-[#37352f]",
            )}
            style={{
              left: geom.table.left - 22,
              top: rowDrag ? rowDrag.y - host.top - 12 : geom.rows[activeRow].top + geom.rows[activeRow].height / 2 - 12,
              transition: rowDrag ? "none" : undefined,
            }}
            onMouseDown={(event) => event.preventDefault()}
            onPointerDown={(event) => startRowDrag(event, activeRow)}
            onClick={() => {
              if (!suppressClick.current) return;
              suppressClick.current = false;
            }}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}

        {activeCol != null && geom.cols[activeCol] ? (
          <button
            type="button"
            data-table-handle
            title="Column options"
            className={cn(
              "table-col-grip pointer-events-auto absolute h-2 w-6 cursor-pointer rounded-full",
              menu?.kind === "column" ? "bg-[#337ea9]" : "bg-[#d3d1cb] hover:bg-[#337ea9]",
            )}
            style={{
              left: geom.cols[activeCol].left + geom.cols[activeCol].width / 2 - 12,
              top: geom.table.top - 10,
            }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (menu?.kind === "column" && menu.index === activeCol) {
                setMenu(null);
                return;
              }
              openMenu({ kind: "column", index: activeCol });
            }}
          />
        ) : null}

        <button
          type="button"
          data-table-handle
          className="table-edge-x pointer-events-auto absolute flex size-7 cursor-pointer items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#37352f]/55 shadow-[0_1px_2px_rgba(15,15,15,0.06),0_6px_16px_rgba(15,15,15,0.08)] hover:border-[#337ea9]/40 hover:text-[#337ea9]"
          style={{ left: geom.table.left + geom.table.width - 14, top: geom.table.top + geom.table.height / 2 - 14 }}
          onMouseEnter={() => showTip("column")}
          onMouseLeave={hideTip}
          onPointerDown={(event) => startEdge(event, "column")}
        >
          <Plus className="size-4" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          data-table-handle
          className="table-edge-y pointer-events-auto absolute flex size-7 cursor-pointer items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#37352f]/55 shadow-[0_1px_2px_rgba(15,15,15,0.06),0_6px_16px_rgba(15,15,15,0.08)] hover:border-[#337ea9]/40 hover:text-[#337ea9]"
          style={{ left: geom.table.left + geom.table.width / 2 - 14, top: geom.table.top + geom.table.height - 14 }}
          onMouseEnter={() => showTip("row")}
          onMouseLeave={hideTip}
          onPointerDown={(event) => startEdge(event, "row")}
        >
          <Plus className="size-4" strokeWidth={2.25} />
        </button>

        {rowDrag && geom.rows[rowDrag.to] ? (
          <div
            className="pointer-events-none absolute z-30 h-0.5 rounded-full bg-[#337ea9]"
            style={{ top: geom.rows[rowDrag.to].top, left: geom.table.left, width: geom.table.width }}
          />
        ) : null}
      </div>

      {tip === "column" && !edgePreview ? (
        <EdgeTip
          text="Click to add a new column"
          hint="Drag to add or remove columns"
          x={host.left + geom.table.left + geom.table.width + 22}
          y={host.top + geom.table.top + geom.table.height / 2 - 20}
        />
      ) : null}
      {tip === "row" && !edgePreview ? (
        <EdgeTip
          text="Click to add a new row"
          hint="Drag to add or remove rows"
          x={host.left + geom.table.left + geom.table.width / 2 - 96}
          y={host.top + geom.table.top + geom.table.height + 22}
        />
      ) : null}
      {edgePreview && edgePreview.count !== 0 ? (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-[#1f1f1f] px-2 py-1 text-[12px] text-white"
          style={{ top: edgePreview.y + 16, left: edgePreview.x + 14 }}
        >
          {edgePreview.count > 0 ? `+${edgePreview.count}` : edgePreview.count}{" "}
          {Math.abs(edgePreview.count) === 1
            ? edgePreview.axis === "column"
              ? "column"
              : "row"
            : edgePreview.axis === "column"
              ? "columns"
              : "rows"}
        </div>
      ) : null}

      {menu && menuBox && tableNode ? (
        <div
          data-table-menu
          className="fixed z-50"
          style={{ top: menuBox.top, left: menuBox.left, width: MENU_WIDTH }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div
            className="animate-in fade-in-0 zoom-in-95 rounded-xl border border-black/10 bg-white p-1 text-[#37352f] shadow-[0_8px_28px_rgba(0,0,0,0.12)] duration-150 ease-out"
            onMouseOver={(event) => {
              const target = event.target instanceof Element ? event.target : null;
              const overColor = Boolean(target?.closest("[data-color-row]"));
              const overButton = Boolean(target?.closest("button"));
              if (!overColor && !overButton) return;
              setColors((open) => (overColor ? true : overButton ? false : open));
            }}
          >
            {menu.kind === "block" ? (
              <>
                <MenuRow icon={UnfoldHorizontal} label="Fit to width" onClick={() => run((tablePos) => {
                  ensureTableCursor(editor, tablePos);
                  fitTableToWidth(editor);
                })} />
                <ToggleRow
                  label="Header row"
                  on={tableHeaderState(tableNode).headerRow}
                  onClick={() => run((tablePos) => {
                    const table = editor.state.doc.nodeAt(tablePos);
                    if (!table) return;
                    setRowHeader(editor, tablePos, 0, !tableHeaderState(table).headerRow);
                  }, false)}
                />
                <ToggleRow
                  label="Header column"
                  on={tableHeaderState(tableNode).headerColumn}
                  onClick={() => run((tablePos) => {
                    const table = editor.state.doc.nodeAt(tablePos);
                    if (!table) return;
                    setColumnHeader(editor, tablePos, 0, !tableHeaderState(table).headerColumn);
                  }, false)}
                />
                <Divider />
                <MenuRow icon={Copy} label="Duplicate" onClick={() => run((tablePos) => {
                  ensureTableCursor(editor, tablePos);
                  duplicateTable(editor);
                })} />
                <MenuRow icon={Trash2} label="Delete table" onClick={() => run((tablePos) => {
                  ensureTableCursor(editor, tablePos);
                  editor.chain().focus().deleteTable().run();
                })} />
              </>
            ) : null}

            {menu.kind === "row" ? (
              <>
                {menu.index === 0 ? (
                  <ToggleRow
                    label="Header row"
                    on={rowIsHeader(tableNode, 0)}
                    onClick={() => run((tablePos) => {
                      const table = editor.state.doc.nodeAt(tablePos);
                      if (!table) return;
                      setRowHeader(editor, tablePos, 0, !rowIsHeader(table, 0));
                    }, false)}
                  />
                ) : null}
                <ColorRow open={colors} onOpen={() => setColors(true)} />
                <Divider />
                <MenuRow icon={ArrowUp} label="Insert above" onClick={() => run((tablePos) => {
                  selectRow(editor, tablePos, menu.index);
                  editor.chain().focus().addRowBefore().run();
                })} />
                <MenuRow icon={ArrowDown} label="Insert below" onClick={() => run((tablePos) => {
                  selectRow(editor, tablePos, menu.index);
                  editor.chain().focus().addRowAfter().run();
                })} />
                <MenuRow icon={Copy} label="Duplicate" onClick={() => run((tablePos) => duplicateRowAt(editor, tablePos, menu.index))} />
                <Divider />
                <MenuRow icon={Eraser} label="Clear contents" onClick={() => run((tablePos) => {
                  selectRow(editor, tablePos, menu.index);
                  clearTableCells(editor);
                })} />
                <MenuRow icon={Trash2} label="Delete" onClick={() => run((tablePos) => {
                  selectRow(editor, tablePos, menu.index);
                  editor.chain().focus().deleteRow().run();
                })} />
              </>
            ) : null}

            {menu.kind === "column" ? (
              <>
                {menu.index === 0 ? (
                  <ToggleRow
                    label="Header column"
                    on={columnIsHeader(tableNode, 0)}
                    onClick={() => run((tablePos) => {
                      const table = editor.state.doc.nodeAt(tablePos);
                      if (!table) return;
                      setColumnHeader(editor, tablePos, 0, !columnIsHeader(table, 0));
                    }, false)}
                  />
                ) : null}
                <ColorRow open={colors} onOpen={() => setColors(true)} />
                <Divider />
                <MenuRow icon={ArrowLeft} label="Insert left" onClick={() => run((tablePos) => {
                  selectColumn(editor, tablePos, menu.index);
                  editor.chain().focus().addColumnBefore().run();
                })} />
                <MenuRow icon={ArrowRight} label="Insert right" onClick={() => run((tablePos) => {
                  selectColumn(editor, tablePos, menu.index);
                  editor.chain().focus().addColumnAfter().run();
                })} />
                <MenuRow icon={Copy} label="Duplicate" onClick={() => run((tablePos) => duplicateColumnAt(editor, tablePos, menu.index))} />
                <Divider />
                <MenuRow icon={Eraser} label="Clear contents" onClick={() => run((tablePos) => {
                  selectColumn(editor, tablePos, menu.index);
                  clearTableCells(editor);
                })} />
                <MenuRow icon={Trash2} label="Delete" onClick={() => run((tablePos) => {
                  selectColumn(editor, tablePos, menu.index);
                  editor.chain().focus().deleteColumn().run();
                })} />
              </>
            ) : null}
          </div>
          {colors && menu.kind !== "block" ? (
            <div
              className={cn(
                "absolute top-0 w-[228px] animate-in fade-in-0 zoom-in-95 rounded-xl border border-black/10 bg-white p-2 text-[#37352f] shadow-[0_8px_28px_rgba(0,0,0,0.12)] duration-150 ease-out",
                flipColors ? "right-full mr-1" : "left-full ml-1",
              )}
            >
              <ColorFlyout onPaint={paint} />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function measureTable(editor: Editor, frame: HTMLElement, wrapper: HTMLElement): Geom | null {
  const tablePos = tablePosFromDom(editor, wrapper);
  const tableEl = wrapper.querySelector("table");
  if (tablePos == null || !tableEl) return null;
  const host = frame.getBoundingClientRect();
  const toRect = (rect: DOMRect): Rect => ({
    top: rect.top - host.top,
    left: rect.left - host.left,
    width: rect.width,
    height: rect.height,
  });
  const rows = [...tableEl.rows].map((row) => toRect(row.getBoundingClientRect()));
  const cols = visualColumns(tableEl).map((rect) => toRect(rect));
  if (rows.length === 0 || cols.length === 0) return null;
  return {
    tablePos,
    table: toRect(tableEl.getBoundingClientRect()),
    rows,
    cols,
  };
}

function visualColumns(table: HTMLTableElement) {
  const cells = [...(table.rows[0]?.cells ?? [])];
  const rects: DOMRect[] = [];
  cells.forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    const span = cell.colSpan || 1;
    const width = rect.width / span;
    for (let index = 0; index < span; index += 1) {
      rects.push(new DOMRect(rect.left + index * width, rect.top, width, rect.height));
    }
  });
  return rects;
}

function hitTest(geom: Geom, x: number, y: number): Hover {
  const row = geom.rows.findIndex((item) => y >= item.top - 10 && y < item.top + item.height + 10);
  const col = geom.cols.findIndex((item) => x >= item.left - 8 && x < item.left + item.width + 8);
  return { row: row >= 0 ? row : null, col: col >= 0 ? col : null };
}

function nearTable(geom: Geom, x: number, y: number) {
  const pad = 40;
  const table = geom.table;
  return x >= table.left - pad && x <= table.left + table.width + pad && y >= table.top - pad && y <= table.top + table.height + pad;
}

function selectionWrapper(editor: Editor) {
  if (!(editor.state.selection instanceof CellSelection)) return null;
  const found = findTable(editor);
  if (!found) return null;
  const dom = editor.view.nodeDOM(found.pos);
  return dom instanceof HTMLElement ? dom : null;
}

function menuPosition(menu: MenuState | null, geom: Geom, host: DOMRect) {
  if (!menu) return null;
  let top = host.top + geom.table.top + 28;
  let left = host.left + geom.table.left - 46;
  if (menu.kind === "row" && geom.rows[menu.index]) {
    top = host.top + geom.rows[menu.index].top + 24;
    left = host.left + geom.table.left - 22;
  }
  if (menu.kind === "column" && geom.cols[menu.index]) {
    top = host.top + geom.table.top + 8;
    left = host.left + geom.cols[menu.index].left + geom.cols[menu.index].width / 2 - MENU_WIDTH / 2;
  }
  const height = menu.kind === "block" ? 210 : 300;
  return {
    top: Math.max(8, Math.min(top, window.innerHeight - height - 8)),
    left: Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8)),
  };
}

function EdgeTip({ text, hint, x, y }: { text: string; hint: string; x: number; y: number }) {
  return (
    <div className="table-tip pointer-events-none fixed z-50 rounded-md bg-[#1f1f1f] px-2.5 py-1.5 text-left text-[12px] leading-4 text-white shadow-lg" style={{ top: y, left: x }}>
      <div>{text}</div>
      <div className="text-white/65">{hint}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-black/[0.06]" />;
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-[#f1f1ef]" onClick={onClick}>
      <Icon className="size-3.5 text-[#37352f]/55" />
      {label}
    </button>
  );
}

function ColorRow({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      data-color-row
      className={cn(
        "flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-[#f1f1ef]",
        open && "bg-[#f1f1ef]",
      )}
      onFocus={onOpen}
      onClick={onOpen}
    >
      <Palette className="size-3.5 text-[#37352f]/55" />
      <span className="flex-1">Color</span>
      <ChevronRight className="size-3.5 text-[#37352f]/45" />
    </button>
  );
}

function ToggleRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-[#f1f1ef]" onClick={onClick}>
      <span className="size-3.5" />
      <span className="flex-1">{label}</span>
      <span className={cn("relative h-4 w-7 rounded-full transition-colors", on ? "bg-[#337ea9]" : "bg-black/15")}>
        <span className={cn("absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform", on ? "left-3.5" : "left-0.5")} />
      </span>
    </button>
  );
}

function ColorFlyout({ onPaint }: { onPaint: (name: "color" | "backgroundColor", value: string | null) => void }) {
  return (
    <>
      <p className="px-1 pb-1 text-[11px] text-[#37352f]/45">Text color</p>
      <div className="grid grid-cols-5 gap-1">
        {TABLE_TEXT_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            title={color.name}
            className="flex h-7 cursor-pointer items-center justify-center rounded-md border border-black/8 text-[13px] font-medium hover:bg-[#f7f7f5]"
            style={{ color: color.value ?? "#37352f" }}
            onClick={() => onPaint("color", color.value)}
          >
            A
          </button>
        ))}
      </div>
      <p className="px-1 pt-2 pb-1 text-[11px] text-[#37352f]/45">Background color</p>
      <div className="grid grid-cols-5 gap-1">
        {TABLE_BACKGROUND_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            title={color.name}
            className="h-7 cursor-pointer rounded-md border border-black/8"
            style={{ background: color.value ?? "#fff" }}
            onClick={() => onPaint("backgroundColor", color.value)}
          />
        ))}
      </div>
    </>
  );
}
