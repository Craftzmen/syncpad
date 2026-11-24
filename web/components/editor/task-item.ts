import { TaskItem } from "@tiptap/extension-task-item";

function layoutTaskItem(dom: HTMLElement) {
  dom.setAttribute("data-type", "taskItem");
  dom.style.display = "grid";
  dom.style.gridTemplateColumns = "auto minmax(0, 1fr)";
  dom.style.columnGap = "8px";
  dom.style.alignItems = "start";
  dom.style.margin = "1px 0";

  const label = dom.querySelector(":scope > label");
  if (label instanceof HTMLElement) {
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.marginTop = "3px";
    label.style.userSelect = "none";
  }

  const input = dom.querySelector(":scope > label > input");
  if (input instanceof HTMLElement) {
    input.style.width = "16px";
    input.style.height = "16px";
    input.style.margin = "0";
    input.style.cursor = "pointer";
  }

  const content = dom.querySelector(":scope > div");
  if (content instanceof HTMLElement) {
    content.style.minWidth = "0";
  }
}

export const NotionTaskItem = TaskItem.extend({
  addNodeView() {
    const create = this.parent?.();
    return (props) => {
      const view = create?.(props);
      if (!view?.dom || !(view.dom instanceof HTMLElement)) {
        return view ?? { dom: document.createElement("li") };
      }
      const dom = view.dom;
      layoutTaskItem(dom);
      const update = view.update?.bind(view);
      view.update = (node, decorations, innerDecorations) => {
        const ok = update ? update(node, decorations, innerDecorations) : false;
        if (ok) layoutTaskItem(dom);
        return ok;
      };
      return view;
    };
  },
});
