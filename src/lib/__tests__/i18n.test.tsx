import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider, useTranslation, useLocale } from "../i18n";
import { useEffect } from "react";

function Probe() {
  const { t } = useTranslation();
  const { setLocale } = useLocale();
  useEffect(() => setLocale("en"), [setLocale]);
  return <span data-testid="msg">{t("pdf.backLink", { page: 3 })}</span>;
}

describe("I18nProvider", () => {
  it("renders English bundle for pdf.backLink with page=3", () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("msg").textContent).toBe("p. 3 \u2190 Contents");
  });
});