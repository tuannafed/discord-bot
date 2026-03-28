/** Danh sách Discord user id trong env, phân tách bằng dấu phẩy. */
export function parseAdminListIds(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(/[,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
