import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, screen, act } from "@testing-library/react";
import { LiveAnnouncerProvider, useAnnounce } from "../live-announcer";

function Trigger({ message }: { message: string }) {
  const announce = useAnnounce();
  return <button onClick={() => announce(message)}>send</button>;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("LiveAnnouncer", () => {
  it("announces a polite message then clears after 1.5s", () => {
    render(
      <LiveAnnouncerProvider>
        <Trigger message="Hello SR" />
      </LiveAnnouncerProvider>,
    );
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
    act(() => {
      screen.getByText("send").click();
    });
    expect(status.textContent).toBe("Hello SR");
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(status.textContent).toBe("");
  });
});
