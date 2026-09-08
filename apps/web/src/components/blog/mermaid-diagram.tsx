"use client";

import { useEffect, useId, useState } from "react";
import { PreBlock } from "@/components/blog/pre-block";

interface MermaidDiagramProps {
  chart: string;
  description: string;
}

export const MermaidDiagram = ({ chart, description }: MermaidDiagramProps) => {
  const [svg, setSvg] = useState<string>();
  const diagramId = useId().replaceAll(":", "");

  useEffect(() => {
    let isCancelled = false;

    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        const style = getComputedStyle(document.documentElement);
        const token = (name: string) => style.getPropertyValue(name).trim();
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            darkMode: document.documentElement.classList.contains("dark"),
            background: token("--background"),
            primaryColor: token("--card"),
            primaryTextColor: token("--foreground"),
            primaryBorderColor: token("--muted-foreground"),
            secondaryColor: token("--muted"),
            secondaryTextColor: token("--foreground"),
            tertiaryColor: token("--background"),
            tertiaryTextColor: token("--foreground"),
            lineColor: token("--muted-foreground"),
            textColor: token("--foreground"),
            edgeLabelBackground: token("--card"),
            clusterBkg: token("--background"),
            clusterBorder: token("--border"),
            fontFamily: style.fontFamily,
          },
          securityLevel: "strict",
        });
        const rendered = await mermaid.render(`mermaid-${diagramId}`, chart);

        if (!isCancelled) setSvg(rendered.svg);
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [chart, diagramId]);

  if (!svg) {
    return (
      <PreBlock variant="article" language="mermaid" aria-label={description}>
        {chart}
      </PreBlock>
    );
  }

  return (
    <div
      aria-label={description}
      className="my-7 max-w-full overflow-x-auto rounded-xl border border-border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6 [&_svg]:mx-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
      role="img"
      tabIndex={0}
      data-blog-speech-exclude
    />
  );
};
