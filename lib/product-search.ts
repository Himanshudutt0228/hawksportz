export const searchPageSize = 24;

export function parseProductSearch(params: { q?: string | string[]; page?: string | string[] }) {
  const raw = params.q;
  if (raw !== undefined && (typeof raw !== "string" || raw.length > 80 || /[\u0000-\u001f\u007f]/.test(raw))) {
    return { query: "", page: 1, error: "Enter a product name using up to 80 characters." };
  }
  const query = (raw ?? "").trim().replace(/\s+/g, " ");
  if (query.includes("*")) return { query, page: 1, error: "Enter a product name without an asterisk (*)." };
  const page = typeof params.page === "string" && /^[1-9]\d{0,2}$/.test(params.page) ? Number(params.page) : 1;
  return { query, page, error: null };
}

export function productSearchPattern(query: string) {
  // The builder URL-encodes a single column filter; never interpolate raw .or() syntax.
  // Escape SQL LIKE wildcards. The parser rejects PostgREST's * wildcard alias.
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

export function productSearchHref(query: string, page = 1) {
  return `/search?${new URLSearchParams({ q: query, ...(page > 1 ? { page: String(page) } : {}) })}`;
}
