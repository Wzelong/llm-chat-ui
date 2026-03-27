# llm-chat-ui

Portable LLM chat UI library for React, Vue, and Angular.

## Build

```bash
npm run build    # tsup -> dist/
npm run dev      # tsup --watch
```

## Test apps

All test apps link to the root package via `file:../../`.

```bash
# Next.js (self-contained, port 3100)
cd test/nextjs && npm run dev

# FastAPI backend (needed for Vue/Angular, port 8000)
cd test/backend && source .venv/bin/activate && uvicorn main:app --port 8000

# Vue (port 3200, needs backend)
cd test/vue && npx vite --port 3200

# Angular (port 3300, needs backend)
cd test/angular && npx ng serve --port 3300
```

## Code style

- State of the art, simple, concise, minimal comments
- Descriptive naming, no emoji
- React templates: Tailwind + shadcn patterns
- Vue templates: scoped CSS with CSS variables
- Angular templates: inline CSS with inline SVG icons

## Architecture

- `src/` -- package source (adapters, hooks, types, parser)
- `cli/` -- CLI + template files for all 3 frameworks
- `test/` -- integration test apps
- Angular imports must use subpaths (`/adapters/sse`, `/parser`, `/types`) to avoid React bundling
