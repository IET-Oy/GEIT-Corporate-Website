---
name: Corepack workflow launches
description: Replit workflow startup can trigger a nested pnpm self-install when the repository pins a newer package manager.
---

Use `corepack pnpm ...` for artifact workflow commands in this repository instead of invoking bare `pnpm`.

**Why:** a bare workflow command attempted repeated installation of the repository-pinned pnpm version and failed before opening the expected development port, while Corepack-based build commands completed.

**How to apply:** When adjusting or restarting an artifact workflow, verify the configured command invokes the project's package manager through Corepack and then confirm the expected port and route are available.
