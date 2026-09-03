export type ListboxMoveKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

export function moveListboxIndex(
  currentIndex: number,
  optionCount: number,
  key: ListboxMoveKey,
): number {
  if (optionCount <= 0) return -1;
  if (key === "Home") return 0;
  if (key === "End") return optionCount - 1;
  if (currentIndex < 0) return key === "ArrowUp" ? optionCount - 1 : 0;
  return key === "ArrowDown"
    ? (currentIndex + 1) % optionCount
    : (currentIndex - 1 + optionCount) % optionCount;
}

export function findTypeaheadIndex(
  labels: readonly string[],
  query: string,
  currentIndex: number,
): number {
  if (labels.length === 0) return -1;
  const normalized = normalize(query);
  if (normalized === "") return -1;
  const effectiveQuery = [...normalized].every((character) => character === normalized[0])
    ? normalized[0]
    : normalized;

  for (let offset = 1; offset <= labels.length; offset += 1) {
    const index = (Math.max(currentIndex, -1) + offset) % labels.length;
    if (normalize(labels[index] ?? "").startsWith(effectiveQuery)) return index;
  }
  return -1;
}

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
