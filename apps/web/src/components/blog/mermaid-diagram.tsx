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
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
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
    return <PreBlock aria-label={description}>{chart}</PreBlock>;
  }

  return (
    <div
      aria-label={description}
      className="my-6 overflow-x-auto rounded-lg border border-gray-700 bg-gray-900 p-4 [&_svg]:mx-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
      role="img"
    />
  );
};
