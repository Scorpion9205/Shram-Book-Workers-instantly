import { describe, it, expect } from "vitest";
import { BaseRepository } from "../BaseRepository.js";

// Minimal concrete subclass — BaseRepository is abstract and only exposes protected helpers.
class TestRepository extends BaseRepository<unknown> {
  skip(page: number, limit: number) {
    return this.buildSkip(page, limit);
  }
  limit(limit: number) {
    return this.clampLimit(limit);
  }
}

describe("BaseRepository pagination clamping", () => {
  const repo = new TestRepository();

  it("caps an absurdly large limit at 100, instead of running an effectively unbounded query", () => {
    expect(repo.limit(5_000_000)).toBe(100);
  });

  it("passes a normal limit through unchanged", () => {
    expect(repo.limit(20)).toBe(20);
  });

  it("falls back to 10 for a zero, negative, or non-finite limit", () => {
    expect(repo.limit(0)).toBe(10);
    expect(repo.limit(-5)).toBe(10);
    expect(repo.limit(NaN)).toBe(10);
  });

  it("treats page 0 or negative as page 1, never producing a negative skip", () => {
    expect(repo.skip(0, 10)).toBe(0);
    expect(repo.skip(-3, 10)).toBe(0);
  });

  it("computes skip using the clamped limit, not the raw one", () => {
    expect(repo.skip(3, 5_000_000)).toBe(2 * 100); // page 3, clamped limit 100
  });
});
