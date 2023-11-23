export interface IMdxCodeblockProps {
  type: "js" | "xml";
  code: string;
}

const MdxCodeBlock = ({ code, type }: IMdxCodeblockProps) => {
  return (
    <pre className="p-[1em] bg-beige-400 rounded my-[1em]">
      <code>{code}</code>
    </pre>
  );
};

export default MdxCodeBlock;
