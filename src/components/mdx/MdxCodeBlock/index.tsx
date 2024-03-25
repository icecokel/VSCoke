import styles from "./style.module.css";

export type TCodeBlockType = "js" | "jsx" | "ts" | "tsx" | "html" | "xml";

export interface IMdxCodeblockProps {
  type?: TCodeBlockType;
  code: string;
}

// TODO type에 따라 스타일링
const MdxCodeBlock = ({ code, type }: IMdxCodeblockProps) => {
  return (
    <pre className={styles.wrapper}>
      <code className={styles.code}>{code}</code>
    </pre>
  );
};

export default MdxCodeBlock;
