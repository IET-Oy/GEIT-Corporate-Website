---
name: Corepack workflow launches
description: Replit workflow startup can trigger a nested pnpm self-install when the repository pins a newer package manager.
---

Use `corepack pnpm ...` for artifact workflow commands and for any nested package-manager calls inside their scripts; a Corepack outer command does not make bare `pnpm` calls in child scripts safe.

**Why:** bare workflow and nested script commands can resolve to the system pnpm shim, which attempted repeated installation of the repository-pinned pnpm version and failed before opening the expected development port, while explicit Corepack calls completed.

**How to apply:** When adjusting or restarting an artifact workflow, check both its configured command and the invoked package script for bare `pnpm` calls. Use Corepack at both layers, then confirm the expected port and route are available.
