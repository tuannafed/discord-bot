# TanStack Table

Use `@tanstack/react-table` for tables: sorting, filtering, pagination, column visibility. Headless; style with your UI lib (e.g. Tailwind, shadcn).

## Conventions

- Column definitions: use `createColumnHelper` or column def objects; keep column defs in feature or table module
- State: use `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel` as needed
- Data source: feed from TanStack Query (or loader data); do not duplicate server state in table state
- Accessibility: use semantic table markup; support keyboard and screen readers per TanStack Table docs

## Review

- Table state (sort, filter, page) can live in component state or Zustand when shared; server data stays in Query
- Do not fetch inside table components; receive data as props or from hooks
