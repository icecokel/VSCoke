export type TCodeBlockType = "js" | "jsx" | "ts" | "tsx" | "html" | "xml";

export interface IMdxCodeblockProps {
  type?: TCodeBlockType;
  code: string;
}

// TODO type에 따라 스타일링
const MdxCodeBlock = ({ code, type }: IMdxCodeblockProps) => {
  return (
    <pre className="p-[1em] md:p-[2em] bg-beige-400 rounded my-[2em] whitespace-pre-wrap break-words">
      <code className="text-[14px] leading-[2em] text-black">{code}</code>
    </pre>
  );
};

export default MdxCodeBlock;
