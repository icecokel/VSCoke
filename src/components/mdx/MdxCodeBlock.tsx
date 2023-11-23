import { ReactNode } from "react";

export type TCodeBlockType = "js" | "jsx" | "ts" | "tsx" | "html" | "xml";

export interface IMdxCodeblockProps {
  type?: TCodeBlockType;
  code: string;
}

const MdxCodeBlock = ({ code, type }: IMdxCodeblockProps) => {
  return (
    <pre className="p-[1em] bg-beige-400 rounded my-[1em]">
      <code className="text-[14px] leading-[1.5em] text-black">{code}</code>
    </pre>
  );
};

export default MdxCodeBlock;
