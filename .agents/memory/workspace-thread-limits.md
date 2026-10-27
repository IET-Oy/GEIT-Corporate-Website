---
name: Workspace thread limits
description: Handling Vite or Rust-backed tool crashes when the workspace approaches its process/task cap.
---

A Vite development workflow can fail with `failed to spawn thread: Resource temporarily unavailable` when the workspace cgroup's process/task usage is near its limit. A serialized platform test run can also disconnect the CodeExecution worker before returning results. Neither event alone establishes a code syntax or test failure. Check the cgroup's current and maximum task counts using supported local reads, avoid parallel tests/builds, do not kill unrelated processes, and wait for capacity or platform recovery before retrying. A shell-spawn failure can coexist with a responsive CodeExecution Node process; that does not prove the application workflow is healthy.

**Why:** In this workspace, the website workflow aborted at thread creation while the cgroup was near its task ceiling; later, the execution worker disconnected during a serialized platform test run.

**How to apply:** When a Vite or Rust-backed workflow reports thread-spawn errors, first inspect process/task headroom and stop repeated builds. Retry checks only after resources recover, preferably in small individual commands; report checks as incomplete until they actually finish.
