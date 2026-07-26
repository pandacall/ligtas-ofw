import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultFooter } from "./ResultFooter";

describe("ResultFooter — mandatory footer (freshness + DMW verify link + hotline)", () => {
  it("renders the HIGH_RISK report block (snapshot)", () => {
    const html = renderToStaticMarkup(
      <ResultFooter
        dataAsOf={new Date("2026-07-14T05:00:00.000Z")}
        syncedAt={new Date("2026-07-27T05:00:00.000Z")}
        showReportBlock={true}
      />,
    );
    expect(html).toMatchSnapshot();
  });

  it("renders the default (non-HIGH_RISK) footer (snapshot)", () => {
    const html = renderToStaticMarkup(
      <ResultFooter dataAsOf={null} syncedAt={new Date("2026-07-27T05:00:00.000Z")} />,
    );
    expect(html).toMatchSnapshot();
  });

  it("always includes the freshness stamp and official DMW verify link", () => {
    const html = renderToStaticMarkup(
      <ResultFooter dataAsOf={new Date("2026-07-14T05:00:00.000Z")} syncedAt={new Date("2026-07-27T05:00:00.000Z")} />,
    );
    expect(html).toContain("2026-07-14");
    expect(html).toContain("2026-07-27");
    expect(html).toContain("https://dmw.gov.ph");
    expect(html).toContain("1348");
  });

  it("only shows the report block (DMW AIRT + IACAT hotlines) for HIGH_RISK", () => {
    const withoutReport = renderToStaticMarkup(
      <ResultFooter dataAsOf={null} syncedAt={new Date("2026-07-27T05:00:00.000Z")} />,
    );
    expect(withoutReport).not.toContain("Paano mag-report");

    const withReport = renderToStaticMarkup(
      <ResultFooter dataAsOf={null} syncedAt={new Date("2026-07-27T05:00:00.000Z")} showReportBlock={true} />,
    );
    expect(withReport).toContain("Paano mag-report");
    expect(withReport).toContain("1343");
    expect(withReport).toContain("8722-1144");
  });
});
