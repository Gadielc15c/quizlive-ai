type DisplayOption = {
  id: string;
  label?: unknown;
};

export function getDisplayOptionLabel(option: DisplayOption) {
  const id = String(option.id ?? "").trim();
  const label = String(option.label ?? "").trim();

  if (!id || !label) return label;
  if (label.toLowerCase() === id.toLowerCase()) return "";

  const escapedId = escapeRegExp(id);
  return label.replace(new RegExp(`^${escapedId}\\s*[.)\\-:]\\s*`, "i"), "").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
