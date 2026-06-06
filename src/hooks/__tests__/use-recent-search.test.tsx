import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRecentSearch } from "../use-recent-search";

describe("useRecentSearch", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useRecentSearch("food"));
    expect(result.current.items).toEqual([]);
  });

  it("push prepends, dedupes case-insensitively, and caps at 6", () => {
    const { result } = renderHook(() => useRecentSearch("food"));
    act(() => result.current.push("Apple"));
    act(() => result.current.push("Banana"));
    act(() => result.current.push("apple")); // dedupe case-insensitive
    expect(result.current.items).toEqual(["apple", "Banana"]);
    for (let i = 0; i < 10; i++) act(() => result.current.push(`item${i}`));
    expect(result.current.items).toHaveLength(6);
  });

  it("ignores empty/whitespace", () => {
    const { result } = renderHook(() => useRecentSearch("k"));
    act(() => result.current.push("   "));
    expect(result.current.items).toEqual([]);
  });

  it("remove and clear", () => {
    const { result } = renderHook(() => useRecentSearch("k"));
    act(() => result.current.push("a"));
    act(() => result.current.push("b"));
    act(() => result.current.remove("a"));
    expect(result.current.items).toEqual(["b"]);
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
  });

  it("persists to localStorage scoped by key", () => {
    const { result } = renderHook(() => useRecentSearch("scope1"));
    act(() => result.current.push("x"));
    expect(window.localStorage.getItem("recent-search:scope1")).toBe(JSON.stringify(["x"]));
    expect(window.localStorage.getItem("recent-search:scope2")).toBeNull();
  });
});
