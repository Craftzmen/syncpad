export function isGhostTitle(title: string | null | undefined) {
  const value = title?.trim() ?? "";
  return value.length === 0 || value === "Untitled" || value === "New page";
}

/** The title stored for an empty or placeholder name. */
export function canonicalTitle(title: string | null | undefined) {
  const value = title?.trim() ?? "";
  if (!value || isGhostTitle(value)) return "New page";
  return value;
}

export function displayPageTitle(title: string | null | undefined) {
  if (isGhostTitle(title)) return "New page";
  return title!.trim();
}