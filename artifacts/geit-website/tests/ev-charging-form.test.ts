import test from "node:test";
import assert from "node:assert/strict";
import { EV_SESSION_CSV_HEADER, parseEvSessionCsv } from "../src/platform/engineering/model-forms";

const sessionRow = "EV-001,CH-01,2026-01-01T00:00:00Z,2026-01-01T04:00:00Z,2026-01-01T01:00:00Z,2026-01-01T02:00:00Z,12.5";

test("EV session CSV imports validated fields and energy without inventing records", () => {
  const secondRow = "EV-002,CH-02,2026-01-01T00:00:00Z,2026-01-01T04:00:00Z,2026-01-01T02:00:00Z,2026-01-01T03:00:00Z,7";
  const parsed = parseEvSessionCsv(`${EV_SESSION_CSV_HEADER}\n${sessionRow}\n${secondRow}`);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.rows, [{
    sessionId: "EV-001",
    chargerId: "CH-01",
    availableFrom: "2026-01-01T00:00:00Z",
    departureAt: "2026-01-01T04:00:00Z",
    actualStart: "2026-01-01T01:00:00Z",
    actualEnd: "2026-01-01T02:00:00Z",
    energyKwh: 12.5,
  }, {
    sessionId: "EV-002",
    chargerId: "CH-02",
    availableFrom: "2026-01-01T00:00:00Z",
    departureAt: "2026-01-01T04:00:00Z",
    actualStart: "2026-01-01T02:00:00Z",
    actualEnd: "2026-01-01T03:00:00Z",
    energyKwh: 7,
  }]);
});

test("EV session CSV rejects header, column, chronology, amount and duplicate-ID errors", () => {
  const bad = [
    "session,charger,from,to,start,end,energy",
    `${EV_SESSION_CSV_HEADER}\n${sessionRow},extra`,
    `${EV_SESSION_CSV_HEADER}\nEV-002,CH-01,2026-01-01T03:00:00Z,2026-01-01T04:00:00Z,2026-01-01T01:00:00Z,2026-01-01T02:00:00Z,12`,
    `${EV_SESSION_CSV_HEADER}\nEV-003,CH-01,2026-01-01T00:00:00Z,2026-01-01T04:00:00Z,2026-01-01T01:00:00Z,2026-01-01T02:00:00Z,0`,
    `${EV_SESSION_CSV_HEADER}\n${sessionRow}\n${sessionRow}`,
  ];
  for (const input of bad) {
    const parsed = parseEvSessionCsv(input);
    assert.ok(parsed.errors.length > 0);
    assert.deepEqual(parsed.rows, []);
  }
});

test("EV session CSV rejects an empty file or header without data rows", () => {
  assert.ok(parseEvSessionCsv("").errors.length > 0);
  assert.ok(parseEvSessionCsv(EV_SESSION_CSV_HEADER).errors.some((error) => /at least one session/i.test(error)));
});
