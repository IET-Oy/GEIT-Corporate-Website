---
name: Workspace thread limits
description: Handling Vite or Rust-backed tool crashes when the workspace approaches its process/task cap.
---

A Vite development workflow can fail with `failed to spawn thread: Resource temporarily unavailable` when the workspace cgroup's process/task usage is near its limit. Serialized platform test and production-build invocations can also disconnect the CodeExecution worker before returning results. Inspect `pids.events` and `memory.events` separately: a rising PID `max` counter confirms task-limit events, while cumulative `oom_kill` counters do not prove that the latest command was OOM-killed. Neither event alone establishes a code syntax, test, or build failure. Check current and maximum task and memory counts, avoid parallel tests/builds, do not kill unrelated processes, and wait for capacity or platform recovery before retrying. A working shell probe does not prove that the CodeExecution or test runner is healthy.

**Why:** In this workspace, the PID `max` counter increased around a test timeout, while the OOM counters stayed unchanged during that test; a simple shell probe succeeded even though longer test/build runs disconnected or timed out.

**How to apply:** When a Vite or Rust-backed workflow reports thread-spawn errors, first inspect process/task and memory headroom plus cgroup event counters. If a test times out without output, report it as inconclusive and stop rather than repeating it. Retry remaining checks only after resources recover, preferably in small individual commands; report them as incomplete until they actually finish.
