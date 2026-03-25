# React Hook Form

Use React Hook Form for form state and validation. Pair with Zod (or other schema lib) for validation.

## Conventions

- Use `useForm()` with `resolver: zodResolver(schema)` when using Zod
- Keep validation schema colocated or in feature folder; avoid inline schemas in large forms
- Use `Controller` or register with uncontrolled inputs as needed; prefer native inputs with register when possible
- Reset and submit handling: use `handleSubmit(onSubmit)`, `reset()` after successful submit when appropriate

## Review

- Do not store sensitive data in form state longer than necessary
- Accessibility: associate labels, use aria-describedby for errors
