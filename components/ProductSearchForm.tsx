export default function ProductSearchForm({ query = "", label = "Search the store", className = "" }: {
  query?: string; label?: string; className?: string;
}) {
  return <form action="/search" method="get" role="search" aria-label={label} className={`flex min-w-0 gap-2 ${className}`}>
    <input key={query} type="search" name="q" aria-label={label} defaultValue={query}
      placeholder="Search products by name..." maxLength={80} required
      className="min-h-11 min-w-0 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-gray-500 focus:border-brand-link focus:outline-none focus:ring-2 focus:ring-brand-link/25" />
    <button type="submit" className="min-h-11 shrink-0 rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">Search</button>
  </form>;
}
