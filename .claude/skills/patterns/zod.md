# Zod

Use Zod for schema validation (forms, API payloads, env, search params).

## Conventions

- Define schemas in feature or lib modules; export types via `z.infer<typeof schema>`
- Use with React Hook Form: `zodResolver(schema)`; with TanStack Router: `validateSearch: z.object({...})`
- API: validate request body/query with `schema.parse()` or `schema.safeParse()`; return 400 with error shape on failure
- Env: validate `process.env` or `import.meta.env` at startup with a single env schema

## Review

- Do not use Zod for runtime logic that does not need validation
- Error messages should be user- or client-friendly when exposed via API or forms
