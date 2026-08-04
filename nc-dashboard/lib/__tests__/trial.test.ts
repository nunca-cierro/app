import { describe, expect, it } from "vitest";
import { TRIAL_DAYS, daysRemaining } from "@/lib/trial";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("daysRemaining", () => {
  it("returns the days left for a trial created 2 days ago", () => {
    const createdAt = new Date(Date.now() - 2 * DAY_MS).toISOString();
    expect(daysRemaining(createdAt)).toBe(TRIAL_DAYS - 2);
  });

  it("returns 0 once the trial has expired", () => {
    const createdAt = new Date(Date.now() - (TRIAL_DAYS + 3) * DAY_MS).toISOString();
    expect(daysRemaining(createdAt)).toBe(0);
  });

  it("returns 0 for a trial that expires exactly at the deadline", () => {
    const createdAt = new Date(Date.now() - TRIAL_DAYS * DAY_MS).toISOString();
    expect(daysRemaining(createdAt)).toBe(0);
  });
});
