const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const { test } = require("node:test");

const context = { window: {}, document: { addEventListener() {} } };
runInNewContext(readFileSync(resolve(__dirname, "../../main/resources/static/js/feedback.js"), "utf8"), context);
const { dateKey, periodRange, shiftPeriod, summarize, comments } = context.window.recordFeedback;
const date = value => new Date(`${value}T12:00:00`);
const record = (day, calories = 100, proteinG = null) => ({
    date: day, weight: null, meals: [{ name: "食事", calories, proteinG }], workouts: []
});

test("calendar weeks cross the year and end on Sunday", () => {
    const range = periodRange("week", date("2026-01-01"));
    assert.equal(dateKey(range.start), "2025-12-29");
    assert.equal(dateKey(range.end), "2026-01-04");
});

test("month navigation handles leap years, short months and year rollover", () => {
    assert.equal(dateKey(periodRange("month", date("2024-02-29")).end), "2024-02-29");
    assert.equal(dateKey(periodRange("month", date("2025-02-10")).end), "2025-02-28");
    assert.equal(dateKey(shiftPeriod("month", date("2024-03-31"), -1)), "2024-02-01");
    assert.equal(dateKey(shiftPeriod("month", date("2025-12-31"), 1)), "2026-01-01");
});

test("years include the whole calendar year and navigate across leap days", () => {
    const range = periodRange("year", date("2024-02-29"));
    assert.equal(dateKey(range.start), "2024-01-01");
    assert.equal(dateKey(range.end), "2024-12-31");
    assert.equal(dateKey(shiftPeriod("year", date("2024-02-29"), 1)), "2025-01-01");
});

test("all records starts at the earliest meaningful record and excludes the future", () => {
    const records = [record("2025-04-12"), record("2026-09-25"), record("2027-01-01"),
        { date: "2020-01-01", weight: null, meals: [], workouts: [] },
        { date: "2023-02-01", weight: 65, meals: [], workouts: [] }];
    const range = periodRange("all", null, records, date("2026-09-25"));
    assert.equal(dateKey(range.start), "2023-02-01");
    assert.equal(dateKey(range.end), "2026-09-25");
    assert.equal(summarize(records, range.start, range.end).days, 3);
    const empty = periodRange("all", null, [], date("2026-09-25"));
    assert.equal(dateKey(empty.start), "2026-09-25");
});

test("month totals include both boundaries, exclude adjacent months, and preserve missing nutrients", () => {
    const records = [record("2024-01-31", 900), record("2024-02-01", 500, 0),
        record("2024-02-29", 700), record("2024-03-01", 900)];
    const range = periodRange("month", date("2024-02-10"));
    const summary = summarize(records, range.start, range.end);
    assert.equal(summary.mealDays, 2);
    assert.equal(summary.intake, 1200);
    assert.equal(summary.nutrients[0].count, 1);
    assert.equal(summary.nutrients[0].total, 0);
    assert.equal(summary.nutrients[1].count, 0);
});

test("comparison comments use the selected period and mark partial periods", () => {
    const summary = summarize([record("2026-09-25")], date("2026-09-01"), date("2026-09-25"));
    const text = comments(summary, { days: 1, workoutDays: 2 }, { previous: "前月", current: "この月（今日まで）" }).trend;
    assert.match(text, /前月2日・この月（今日まで）0日/);
    assert.doesNotMatch(text, /前週/);
    assert.doesNotMatch(comments(summary).trend, /前週|前月|前年/);
});
