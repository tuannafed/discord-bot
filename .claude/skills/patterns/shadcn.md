# shadcn/ui

Use shadcn/ui for UI primitives: copy components into the project (not an npm dependency), customize with Tailwind, keep in `src/components/ui/`.

## Conventions

- Add components via CLI: `npx shadcn@latest add <component>`
- Components live under `src/components/ui/` (or `components/ui/` per project)
- Use Tailwind for styling; follow existing design tokens
- Prefer composition over prop drilling; use Radix UI primitives under the hood as documented by shadcn

## Review

- Do not ship unused shadcn components; only add what the feature needs
- Keep accessibility (Radix) behavior; do not remove ARIA or keyboard handling
