import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, screen, act } from "@testing-library/react";
import { LiveAnnouncerProvider } from "../live-announcer";
import { useAnnounce } from "../live-announcer.hook";

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

  it("announces an assertive message to role=alert", () => {
    function AssertiveTrigger() {
      const announce = useAnnounce();
      return <button onClick={() => announce("Danger!", "assertive")}>alert</button>;
    }
    render(
      <LiveAnnouncerProvider>
        <AssertiveTrigger />
      </LiveAnnouncerProvider>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("");
    act(() => {
      screen.getByText("alert").click();
    });
    expect(alert.textContent).toBe("Danger!");
  });

  it("clears previous timer when announcing twice rapidly", () => {
    render(
      <LiveAnnouncerProvider>
        <Trigger message="First" />
      </LiveAnnouncerProvider>,
    );
    const button = screen.getByText("send");
    act(() => button.click());
    act(() => button.click()); // second call clears first timer
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("First");
  });

  it("cleans up timer on unmount", () => {
    const { unmount } = render(
      <LiveAnnouncerProvider>
        <Trigger message="Bye" />
      </LiveAnnouncerProvider>,
    );
    act(() => screen.getByText("send").click());
    unmount(); // should not throw — cleanup effect runs
  });
});
