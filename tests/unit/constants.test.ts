import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  getAllowedTransitions,
  ALL_STATUSES,
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  ROLE_LABELS,
} from "@/lib/constants";

describe("Status transitions", () => {
  it("allows available → listed", () => {
    expect(isValidTransition("available", "listed")).toBe(true);
  });
  it("allows available → sold", () => {
    expect(isValidTransition("available", "sold")).toBe(true);
  });
  it("allows available → donated", () => {
    expect(isValidTransition("available", "donated")).toBe(true);
  });
  it("allows available → discarded", () => {
    expect(isValidTransition("available", "discarded")).toBe(true);
  });
  it("allows listed → available", () => {
    expect(isValidTransition("listed", "available")).toBe(true);
  });
  it("allows listed → sold", () => {
    expect(isValidTransition("listed", "sold")).toBe(true);
  });
  it("allows sold → returned", () => {
    expect(isValidTransition("sold", "returned")).toBe(true);
  });
  it("allows returned → available", () => {
    expect(isValidTransition("returned", "available")).toBe(true);
  });
  it("rejects sold → available", () => {
    expect(isValidTransition("sold", "available")).toBe(false);
  });
  it("rejects donated → anything (terminal)", () => {
    for (const s of ALL_STATUSES) {
      expect(isValidTransition("donated", s)).toBe(false);
    }
  });
  it("rejects discarded → anything (terminal)", () => {
    for (const s of ALL_STATUSES) {
      expect(isValidTransition("discarded", s)).toBe(false);
    }
  });
  it("rejects sold → donated", () => {
    expect(isValidTransition("sold", "donated")).toBe(false);
  });
  it("rejects available → returned", () => {
    expect(isValidTransition("available", "returned")).toBe(false);
  });
  it("getAllowedTransitions returns the same as ALLOWED_TRANSITIONS", () => {
    for (const s of ALL_STATUSES) {
      expect(getAllowedTransitions(s)).toEqual(ALLOWED_TRANSITIONS[s]);
    }
  });
});

describe("Constants and labels", () => {
  it("has labels for every status", () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_LABELS[s]).toBeTruthy();
    }
  });
  it("has labels for admin and user roles", () => {
    expect(ROLE_LABELS.admin).toBe("Administrator");
    expect(ROLE_LABELS.user).toBe("Standard User");
  });
});
