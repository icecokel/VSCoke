"use client";

import { useRef, useState } from "react";
import Icon from "@/components/base-ui/icon";

interface PreBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
}

export function PreBlock({ children, className, ...props }: PreBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!preRef.current) return;

    const text = preRef.current.innerText;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="relative group mb-4">
      <pre
        ref={preRef}
        className={`bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm ${className || ""}`}
        {...props}
      >
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className={`
          absolute top-2 right-2 p-1.5 rounded-md transition-all
          opacity-0 group-hover:opacity-100 focus:opacity-100
          ${copied ? "bg-green-500/10 text-green-400" : "bg-gray-700/80 text-gray-400 hover:bg-gray-700 hover:text-white"}
        `}
        aria-label="Copy code"
      >
        <Icon kind={copied ? "check" : "content_copy"} size={16} />
      </button>
    </div>
  );
}
