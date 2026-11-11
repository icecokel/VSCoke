import { expect, test } from "@playwright/test";
import { gotoWithRetry } from "./test-helpers";

for (const includeDetails of [false, true]) {
  test(`${includeDetails ? "경력 포함" : "이력서만"} A4 인쇄에서 문맥과 본문을 유지한다`, async ({
    page,
  }, testInfo) => {
    await gotoWithRetry(page, "/ko-KR/resume/preview?resume=print");
    await expect(page.locator(".resume-preview-career-heading").first()).toHaveCSS(
      "break-after",
      "auto",
    );
    await page.evaluate(() => {
      window.print = () => {};
    });
    await page.getByTestId("resume-preview-save-pdf").click();
    await page
      .getByTestId(
        includeDetails
          ? "resume-preview-download-with-career-details"
          : "resume-preview-download-resume-only",
      )
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready);
    const details = page.getByTestId("resume-preview-career-detail-document");
    const detailCount = await details.count();
    if (includeDetails) await expect(details.first()).toBeVisible();
    else await expect(details.first()).toBeHidden();
    const images = details.locator("img");
    await expect(images).toHaveCount(2);
    await images.evaluateAll(elements =>
      Promise.all(elements.map(element => (element as HTMLImageElement).decode())),
    );
    await page.pdf({
      path: testInfo.outputPath("resume.pdf"),
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
    });

    const layout = await page.evaluate(includeDetails => {
      // PDF 생성의 afterprint 이벤트로 정리된 모드를 레이아웃 측정에 다시 적용한다.
      document.body.classList.toggle("resume-print-with-details", includeDetails);
      const documentElement = document.querySelector<HTMLElement>(".resume-preview-document")!;
      const careers = Array.from(documentElement.querySelectorAll(".resume-preview-career"));
      const detailElements = Array.from(
        document.querySelectorAll<HTMLElement>(".resume-preview-career-detail-document"),
      );
      const headingStyles = Array.from(
        document.querySelectorAll(".resume-preview-page :is(h1, h2, h3, h4, h5, h6)"),
        element => getComputedStyle(element).breakAfter,
      );
      const paragraphStyles = getComputedStyle(documentElement.querySelector("p")!);
      const paragraphLines = { orphans: paragraphStyles.orphans, widows: paragraphStyles.widows };

      // PDF 파서 의존성 없이 A4 여백을 뺀 고정 높이 단에서 실제 분할 위치를 측정한다.
      const pages = document.createElement("div");
      pages.style.cssText =
        "width:186mm;height:281mm;column-width:186mm;column-gap:0;column-fill:auto;";
      documentElement.before(pages);
      pages.append(documentElement);
      if (includeDetails) {
        for (const detail of detailElements) {
          detail.style.breakBefore = "column";
          pages.append(detail);
        }
      }
      const pageWidth = pages.getBoundingClientRect().width;
      const pageHeight = pages.getBoundingClientRect().height;
      const left = pages.getBoundingClientRect().left;
      const pageNumber = (element: Element, last = false) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rects = Array.from(
          element instanceof HTMLImageElement ? element.getClientRects() : range.getClientRects(),
        ).filter(rect => rect.width && rect.height);
        const rect = last ? rects[rects.length - 1] : rects[0];
        return Math.floor((rect.left - left + 1) / pageWidth);
      };
      const companyPages = careers.map(career => ({
        heading: pageNumber(career.querySelector(".resume-preview-career-heading")!),
        first: pageNumber(career.querySelector(".resume-preview-description")!),
      }));
      const detailPages = includeDetails ? detailElements.map(detail => pageNumber(detail)) : [];
      const pageCount = Math.ceil((pages.scrollWidth - 1) / pageWidth);
      const occupiedPages = new Set<number>();
      for (const element of pages.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6")) {
        const range = document.createRange();
        range.selectNodeContents(element);
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width && rect.height)
            occupiedPages.add(Math.floor((rect.left - left + 1) / pageWidth));
        }
      }

      // 정상 MDX 출력의 이미지·캡션을 전체 문서에서 측정한다.
      const measureImages = () =>
        detailElements.map(detail => {
          const image = detail.querySelector("img")!;
          const caption =
            detail.querySelector("figcaption") ?? image.closest("p")!.nextElementSibling!;
          return { image: pageNumber(image), caption: pageNumber(caption) };
        });
      const imagePages = includeDetails ? measureImages() : [];
      const unprotectedImagePages: { image: number; caption: number }[] = [];
      if (includeDetails) {
        // 보호 규칙을 빼면 실제로 분리되는지 확인해 경계 fixture의 무효 통과를 막는다.
        const unprotectedStyle = document.createElement("style");
        unprotectedStyle.textContent = `
          .resume-preview-page figure,
          .resume-preview-career-detail-content p:has(img),
          .resume-preview-career-detail-content p:has(img) + p {
            break-inside: auto !important;
            break-after: auto !important;
          }
        `;
        document.head.append(unprotectedStyle);
        unprotectedImagePages.push(...measureImages());
        unprotectedStyle.remove();
      }

      // 회사 제목만 페이지 끝에 들어가는 경계를 고정된 여백으로 재현한다.
      const boundaryPages = careers.map(career => {
        const clone = career.cloneNode(true) as HTMLElement;
        const heading = clone.querySelector<HTMLElement>(".resume-preview-career-heading")!;
        const spacer = document.createElement("div");
        documentElement.replaceChildren(spacer, clone);
        for (const detail of detailElements) detail.remove();
        spacer.style.height = `${pageHeight - heading.getBoundingClientRect().height - 20}px`;
        const descriptions = clone.querySelectorAll(".resume-preview-description");
        return {
          heading: pageNumber(heading),
          first: pageNumber(descriptions[0]),
          last: pageNumber(descriptions[descriptions.length - 1], true),
        };
      });

      pages.remove();
      return {
        companyPages,
        detailPages,
        pageCount,
        boundaryPages,
        imagePages,
        unprotectedImagePages,
        occupiedPages: [...occupiedPages].sort((a, b) => a - b),
        headingStyles,
        paragraphLines,
      };
    }, includeDetails);

    await testInfo.attach("print-layout", {
      body: JSON.stringify(layout, null, 2),
      contentType: "application/json",
    });
    for (const company of [...layout.companyPages, ...layout.boundaryPages]) {
      expect(company.heading).toBe(company.first);
    }
    expect(layout.boundaryPages.some(company => company.last > company.heading)).toBe(true);
    expect(layout.imagePages).toHaveLength(includeDetails ? 2 : 0);
    for (const image of layout.imagePages) {
      expect(image.image).toBe(image.caption);
    }
    expect(layout.unprotectedImagePages).toHaveLength(includeDetails ? 2 : 0);
    for (const image of layout.unprotectedImagePages) expect(image.caption).toBe(image.image + 1);
    expect(layout.occupiedPages.length).toBeGreaterThan(1);
    expect(layout.occupiedPages).toEqual(
      Array.from({ length: layout.pageCount }, (_, index) => index),
    );
    expect(layout.detailPages).toHaveLength(includeDetails ? detailCount : 0);
    expect(layout.headingStyles.every(value => value === "avoid")).toBe(true);
    expect(layout.paragraphLines).toEqual({ orphans: "3", widows: "3" });
  });
}
