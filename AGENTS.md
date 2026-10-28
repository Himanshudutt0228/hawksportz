<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Security and code quality

- The user requires security to be the highest priority throughout this project.
- Keep code simple, maintainable, and understandable to a human reader. Prefer explicit names and straightforward control flow over clever abstractions.
- Enforce authentication and authorization on the server and at the database where applicable. Never rely on hidden UI controls for access protection.
- Never allow public sign-up or user-editable metadata to grant admin privileges. Keep privileged secrets server-only and out of logs and source control.
- Validate untrusted input, use safe redirects, and test protected access and failure paths for security-sensitive changes.

## Project continuity

- Read `PROJECT_CONTEXT.md` before starting work in a new conversation.
- Keep `PROJECT_CONTEXT.md` current when the user confirms important business details, preferences, decisions, or when material work is completed. Record outstanding work and useful verification results so a new conversation can continue.
- Distinguish user-confirmed requirements, public website facts, and assumptions. Do not invent missing history or treat proposals as approved decisions.
- Never store secrets, credentials, or customer personal data in context notes.
- Preserve the generated Next.js instructions above.
