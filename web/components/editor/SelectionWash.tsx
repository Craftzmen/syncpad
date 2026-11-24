"use client";

import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { useEffect, useRef } from "react";
import { CellSelection } from "prosemirror-tables";

import { requestClearTitle } from "@/lib/editor-events";

const BLUE = "rgba(35, 131, 226, 0.14)";

export function SelectionWash({ editor, frame }: { editor: Editor; frame: HTMLElement | null }) {
  const marked = useRef<HTMLElement[]>([]);
  const dragging = useRef(false);

  useEffect(() => {
    if (!frame) return;
    const article = frame.closest("article") ?? editor.view.dom;
    editor.view.dom.style.pointerEvents = "";

    const clearMarks = () => {
      marked.current.forEach(unmark);
      marked.current = [];
      clearCellBox(editor);
      if (article instanceof HTMLElement) hideSquare(article);
    };

    const showBlocks = (blocks: HTMLElement[], title: boolean) => {
      const next = [...blocks];
      const input = titleInput(article);
      if (title && input) next.push(input);
      marked.current.forEach(unmark);
      marked.current = next;
      if (article instanceof HTMLElement) placeSquare(article, unionBox(next));
      clearCellBox(editor);
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !article.contains(target)) return;
      if (target.closest("[data-table-handle]")) {
        clearMarks();
        return;
      }
      if (target.closest("[data-table-menu], button, a, select, textarea")) return;
      if (editor.view.dom.classList.contains("resize-cursor")) return;

      clearMarks();
      const startX = event.clientX;
      const startY = event.clientY;
      const onTitle = target instanceof HTMLInputElement;
      const startBlock = blockFromPoint(editor, startX, startY);
      let mode: "pending" | "text" | "cells" | "free" = "pending";
      let lastRect: Box | null = null;
      const endDrag = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.body.style.userSelect = "";
        editor.view.dom.style.pointerEvents = "";
        dragging.current = false;
        hideMarquee();
      };

      const onMove = (move: PointerEvent) => {
        if (mode === "pending" && Math.hypot(move.clientX - startX, move.clientY - startY) < 4) return;
        const rect = boxFrom(startX, startY, move.clientX, move.clientY);
        const table =
          startBlock?.matches(".tableWrapper, table") ? startBlock : startBlock?.closest(".tableWrapper");
        if (
          mode !== "free" &&
          table instanceof HTMLElement &&
          rectInside(rect, table.getBoundingClientRect())
        ) {
          mode = "cells";
          dragging.current = true;
          const anchor = editor.view.posAtCoords({ left: startX, top: startY });
          const head = editor.view.posAtCoords({ left: move.clientX, top: move.clientY });
          if (anchor && head) selectCells(editor, anchor.pos, head.pos);
          if (article instanceof HTMLElement) hideSquare(article);
          showCellBox(editor);
          return;
        }
        const titleGesture = onTitle && titleTextGesture(target, startX, startY, move.clientX, move.clientY);
        const inStartText =
          !!startBlock &&
          !startBlock.matches(".tableWrapper, table") &&
          !startBlock.closest(".tableWrapper") &&
          rectInside(rect, startBlock.getBoundingClientRect());
        if (mode !== "free" && (titleGesture || inStartText)) {
          mode = "text";
          return;
        }

        mode = "free";
        lastRect = rect;
        dragging.current = true;
        move.preventDefault();
        document.body.style.userSelect = "none";
        window.getSelection()?.removeAllRanges();
        if (onTitle) target.setSelectionRange(0, 0);
        clearCellBox(editor);
        placeMarquee(rect);
        const blocks = blocksIntersecting(editor, rect);
        const title = titleIntersects(article, rect);
        if (blocks.length + (title ? 1 : 0) === 0) {
          marked.current.forEach(unmark);
          marked.current = [];
          if (article instanceof HTMLElement) hideSquare(article);
          return;
        }
        showBlocks(blocks, title);
      };

      const onUp = () => {
        const dragged = mode;
        const rect = lastRect;
        endDrag();
        if (dragged !== "free" || !rect) return;
        const blocks = blocksIntersecting(editor, rect);
        const title = titleIntersects(article, rect);
        if (blocks.length + (title ? 1 : 0) === 0) {
          clearMarks();
          return;
        }
        showBlocks(blocks, title);
        const positions = blocks.flatMap((element) => blockPos(editor, element));
        if (positions.length > 0) selectBlocks(editor, positions);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      dragStop = endDrag;
    };

    const onSelection = () => {
      if (dragging.current || marked.current.length > 0) return;
      if (isCellSelection(editor.state.selection)) {
        showCellBox(editor);
        return;
      }
      clearCellBox(editor);
      const blocks = blocksInSelection(editor);
      if (blocks.length > 1) showBlocks(blocks, false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (dragging.current || marked.current.length === 0) return;
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      const title = titleInput(article);
      if (
        (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
        active !== title
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const blocks = marked.current.filter((element) => element !== title);
      const titleSelected = !!title && marked.current.includes(title);
      deleteSelected(
        editor,
        blocks.flatMap((element) => blockPos(editor, element)),
      );
      if (titleSelected) requestClearTitle();
      clearMarks();
    };

    let dragStop: (() => void) | null = null;
    article.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    editor.on("selectionUpdate", onSelection);
    return () => {
      dragStop?.();
      article.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
      editor.off("selectionUpdate", onSelection);
      clearMarks();
      document.body.style.userSelect = "";
      editor.view.dom.style.pointerEvents = "";
    };
  }, [editor, frame]);

  return null;
}

function unmark(element: HTMLElement) {
  delete element.dataset.notionSelected;
  element.style.backgroundColor = "";
  element.style.boxShadow = "";
  element.style.borderRadius = "";
}

type Box = { left: number; top: number; right: number; bottom: number };

function boxFrom(x1: number, y1: number, x2: number, y2: number): Box {
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    right: Math.max(x1, x2),
    bottom: Math.max(y1, y2),
  };
}

function rectInside(inner: Box, outer: DOMRect) {
  return inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom;
}

function rectsIntersect(a: Box, b: DOMRect) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function titleTextGesture(target: Element, x1: number, y1: number, x2: number, y2: number) {
  if (!(target instanceof HTMLInputElement)) return false;
  const bounds = target.getBoundingClientRect();
  const inside = y2 >= bounds.top && y2 <= bounds.bottom && x2 >= bounds.left && x2 <= bounds.right;
  return inside && Math.abs(x2 - x1) >= Math.abs(y2 - y1);
}

function blockFromPoint(editor: Editor, x: number, y: number) {
  const hit = editor.view.posAtCoords({ left: x, top: y });
  if (!hit) return null;
  const size = editor.state.doc.content.size;
  const $pos = editor.state.doc.resolve(Math.max(1, Math.min(hit.pos, Math.max(1, size))));
  if ($pos.depth < 1) return null;
  const dom = editor.view.nodeDOM($pos.before(1));
  return dom instanceof HTMLElement ? dom : null;
}

function blocksIntersecting(editor: Editor, rect: Box) {
  const blocks: HTMLElement[] = [];
  editor.state.doc.forEach((_node, pos) => {
    const dom = editor.view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) return;
    if (rectsIntersect(rect, dom.getBoundingClientRect())) blocks.push(dom);
  });
  return blocks;
}

function titleIntersects(article: Element, rect: Box) {
  const input = titleInput(article);
  if (!input) return false;
  return rectsIntersect(rect, input.getBoundingClientRect());
}

function unionBox(elements: HTMLElement[]): Box | null {
  if (elements.length === 0) return null;
  const rects = elements.map((element) => element.getBoundingClientRect());
  return {
    left: Math.min(...rects.map((rect) => rect.left)) - 4,
    top: Math.min(...rects.map((rect) => rect.top)) - 3,
    right: Math.max(...rects.map((rect) => rect.right)) + 4,
    bottom: Math.max(...rects.map((rect) => rect.bottom)) + 3,
  };
}

function squareEl(article: HTMLElement) {
  const existing = article.querySelector(":scope > .notion-select-square");
  if (existing instanceof HTMLElement) return existing;
  const square = document.createElement("div");
  square.className = "notion-select-square";
  square.style.position = "absolute";
  square.style.zIndex = "4";
  square.style.pointerEvents = "none";
  square.style.background = BLUE;
  square.style.border = "1px solid rgba(35, 131, 226, 0.45)";
  square.style.borderRadius = "4px";
  square.style.boxSizing = "border-box";
  article.prepend(square);
  return square;
}

function placeSquare(article: HTMLElement, rect: Box | null) {
  const square = squareEl(article);
  if (!rect || rect.right - rect.left < 2 || rect.bottom - rect.top < 2) {
    square.style.display = "none";
    return;
  }
  const host = article.getBoundingClientRect();
  square.style.display = "block";
  square.style.left = `${rect.left - host.left}px`;
  square.style.top = `${rect.top - host.top}px`;
  square.style.width = `${rect.right - rect.left}px`;
  square.style.height = `${rect.bottom - rect.top}px`;
}

function hideSquare(article: HTMLElement) {
  const square = article.querySelector(":scope > .notion-select-square");
  if (square instanceof HTMLElement) square.style.display = "none";
}

function marqueeEl() {
  const existing = document.querySelector("body > .notion-select-marquee");
  if (existing instanceof HTMLElement) return existing;
  const marquee = document.createElement("div");
  marquee.className = "notion-select-marquee";
  marquee.style.position = "fixed";
  marquee.style.zIndex = "80";
  marquee.style.pointerEvents = "none";
  marquee.style.background = BLUE;
  marquee.style.border = "1px solid rgba(35, 131, 226, 0.8)";
  marquee.style.borderRadius = "2px";
  document.body.appendChild(marquee);
  return marquee;
}

function placeMarquee(rect: Box) {
  const marquee = marqueeEl();
  marquee.style.display = "block";
  marquee.style.left = `${rect.left}px`;
  marquee.style.top = `${rect.top}px`;
  marquee.style.width = `${Math.max(0, rect.right - rect.left)}px`;
  marquee.style.height = `${Math.max(0, rect.bottom - rect.top)}px`;
}

function hideMarquee() {
  const marquee = document.querySelector("body > .notion-select-marquee");
  if (marquee instanceof HTMLElement) marquee.style.display = "none";
}

function blocksInSelection(editor: Editor) {
  const { from, to, empty } = editor.state.selection;
  if (empty || isCellSelection(editor.state.selection)) return [];
  const blocks: HTMLElement[] = [];
  editor.state.doc.forEach((node, pos) => {
    if (pos + node.nodeSize <= from || pos >= to) return;
    const dom = editor.view.nodeDOM(pos);
    if (dom instanceof HTMLElement) blocks.push(dom);
  });
  return blocks;
}

function titleInput(article: Element) {
  const input = article.querySelector("input");
  return input instanceof HTMLInputElement ? input : null;
}

function blockPos(editor: Editor, element: HTMLElement) {
  let found: number[] = [];
  editor.state.doc.forEach((_node, pos) => {
    if (editor.view.nodeDOM(pos) === element) found = [pos];
  });
  return found;
}

function deleteSelected(editor: Editor, positions: number[]) {
  const { doc, schema } = editor.state;
  const ranges = positions
    .map((pos) => {
      const node = doc.nodeAt(pos);
      return node ? { from: pos, to: pos + node.nodeSize } : null;
    })
    .filter((range): range is { from: number; to: number } => range !== null)
    .sort((a, b) => b.from - a.from);
  if (ranges.length === 0) return;
  const tr = editor.state.tr;
  for (const range of ranges) tr.delete(range.from, range.to);
  if (tr.doc.childCount === 0 && schema.nodes.paragraph) {
    tr.insert(0, schema.nodes.paragraph.create());
  }
  const caret = Math.max(1, Math.min(ranges[ranges.length - 1].from, tr.doc.content.size));
  try {
    tr.setSelection(TextSelection.near(tr.doc.resolve(caret)));
  } catch {
    // The blocks are already removed.
  }
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

function selectBlocks(editor: Editor, positions: number[]) {
  const doc = editor.state.doc;
  const ordered = [...positions].sort((a, b) => a - b);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const lastNode = doc.nodeAt(last);
  if (first == null || !lastNode) return;
  try {
    const start = TextSelection.near(doc.resolve(Math.min(first + 1, doc.content.size)), 1).from;
    const end = TextSelection.near(doc.resolve(Math.max(1, last + lastNode.nodeSize - 1)), -1).to;
    const selection = TextSelection.create(doc, Math.min(start, end), Math.max(start, end));
    if (!editor.state.selection.eq(selection)) editor.view.dispatch(editor.state.tr.setSelection(selection));
  } catch {
    // The blue boxes stay even if the document selection cannot span the table.
  }
}

function selectCells(editor: Editor, anchor: number, head: number) {
  const from = cellBoundary(editor, anchor);
  const to = cellBoundary(editor, head);
  if (from == null || to == null || from === to) return;
  try {
    const selection = new CellSelection(editor.state.doc.resolve(from), editor.state.doc.resolve(to));
    if (!editor.state.selection.eq(selection)) editor.view.dispatch(editor.state.tr.setSelection(selection));
  } catch {
    // Keep the native drag if these positions are not cells.
  }
}

function cellBoundary(editor: Editor, pos: number) {
  const doc = editor.state.doc;
  const $pos = doc.resolve(Math.max(1, Math.min(pos, doc.content.size)));
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const role = $pos.node(depth).type.spec.tableRole;
    if (role === "cell" || role === "header_cell") return $pos.before(depth);
  }
  return null;
}

function showCellBox(editor: Editor) {
  const cell = editor.view.dom.querySelector(".selectedCell");
  const wrapper = cell?.closest(".tableWrapper");
  if (!(wrapper instanceof HTMLElement) || !cell) {
    clearCellBox(editor);
    return;
  }
  const cells = [...wrapper.querySelectorAll(".selectedCell")];
  const host = wrapper.getBoundingClientRect();
  const rects = cells.map((item) => item.getBoundingClientRect());
  const top = Math.min(...rects.map((rect) => rect.top)) - host.top;
  const left = Math.min(...rects.map((rect) => rect.left)) - host.left;
  const right = Math.max(...rects.map((rect) => rect.right)) - host.left;
  const bottom = Math.max(...rects.map((rect) => rect.bottom)) - host.top;
  const existing = wrapper.querySelector(":scope > .notion-cell-select");
  const box = existing instanceof HTMLElement ? existing : document.createElement("div");
  if (box.parentElement !== wrapper) {
    box.className = "notion-cell-select";
    wrapper.appendChild(box);
  }
  box.style.top = `${top}px`;
  box.style.left = `${left}px`;
  box.style.width = `${right - left}px`;
  box.style.height = `${bottom - top}px`;
}

function clearCellBox(editor: Editor) {
  editor.view.dom.querySelectorAll(".notion-cell-select").forEach((element) => element.remove());
}

function isCellSelection(selection: unknown): selection is CellSelection {
  return selection instanceof CellSelection || (!!selection && typeof selection === "object" && "$anchorCell" in selection);
}
