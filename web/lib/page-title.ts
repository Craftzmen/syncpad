export function isGhostTitle(title: string | null | undefined) {
  const value = title?.trim() ?? "";
  return value.length === 0 || value === "Untitled" || value === "New page";
}

export function displayPageTitle(title: string | null | undefined) {
  if (isGhostTitle(title)) return "New page";
  return title!.trim();
}