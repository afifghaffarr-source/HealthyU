import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { useRef, useState } from "react";
import { useMiniFocusTrap } from "../useMiniFocusTrap";

afterEach(cleanup);

function Harness({ onEscape }: { onEscape: () => void }) {
  const [open, setOpen] = useState(true);
  const first = useRef<HTMLButtonElement | null>(null);
  const last = useRef<HTMLButtonElement | null>(null);
  useMiniFocusTrap(open, [first, last], () => {
    onEscape();
    setOpen(false);
  });
  if (!open) return <div>closed</div>;
  return (
    <div>
      <button ref={first}>First</button>
      <button ref={last}>Last</button>
    </div>
  );
}

describe("useMiniFocusTrap", () => {
  it("Shift+Tab on first cycles to last", () => {
    render(<Harness onEscape={() => {}} />);
    const first = screen.getByText("First") as HTMLButtonElement;
    const last = screen.getByText("Last") as HTMLButtonElement;
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("Tab on last cycles to first", () => {
    render(<Harness onEscape={() => {}} />);
    const first = screen.getByText("First") as HTMLButtonElement;
    const last = screen.getByText("Last") as HTMLButtonElement;
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("Escape calls onEscape", () => {
    let escaped = 0;
    render(<Harness onEscape={() => { escaped += 1; }} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(escaped).toBe(1);
  });

  it("autoFocusFirst:false tidak memindahkan fokus saat aktif", () => {
    function NoAutoFocus() {
      const first = useRef<HTMLButtonElement | null>(null);
      const last = useRef<HTMLButtonElement | null>(null);
      useMiniFocusTrap(true, [first, last], undefined, { autoFocusFirst: false });
      return (
        <div>
          <button>Outside</button>
          <button ref={first}>First</button>
          <button ref={last}>Last</button>
        </div>
      );
    }
    render(<NoAutoFocus />);
    expect(document.activeElement).toBe(document.body);
  });

  it("autoFocusFirst:true memindahkan fokus ke first ref", () => {
    function AutoFocus() {
      const first = useRef<HTMLButtonElement | null>(null);
      const last = useRef<HTMLButtonElement | null>(null);
      useMiniFocusTrap(true, [first, last], undefined, { autoFocusFirst: true });
      return (
        <div>
          <button ref={first}>First</button>
          <button ref={last}>Last</button>
        </div>
      );
    }
    render(<AutoFocus />);
    expect(document.activeElement).toBe(screen.getByText("First"));
  });
});