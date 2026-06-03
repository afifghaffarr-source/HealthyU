import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { I18nProvider, useTranslation, useLocale } from "../i18n";
import { useEffect } from "react";

afterEach(cleanup);

function Probe() {
  const { t } = useTranslation();
  const { setLocale } = useLocale();
  useEffect(() => setLocale("en"), [setLocale]);
  return <span data-testid="msg">{t("pdf.backLink", { page: 3 })}</span>;
}

describe("I18nProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders English bundle for pdf.backLink with page=3", () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("msg").textContent).toBe("p. 3 \u2190 Contents");
  });

  it("setLocale('en') updates localStorage key i18n:locale", () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(window.localStorage.getItem("i18n:locale")).toBe("en");
  });

  it("defaults to 'id' when localStorage.getItem throws (SSR-safe)", () => {
    const spy = vi
      .spyOn(window.localStorage.__proto__, "getItem")
      .mockImplementation(() => {
        throw new Error("no storage");
      });
    function DefaultProbe() {
      const { t } = useTranslation();
      return <span data-testid="msg">{t("pdf.footer.pageLabel")}</span>;
    }
    render(
      <I18nProvider>
        <DefaultProbe />
      </I18nProvider>,
    );
    // Indonesian default ("hal") because storage read was swallowed.
    expect(screen.getByTestId("msg").textContent).toBe("hal");
    spy.mockRestore();
  });
});