import { IHaveChildren } from "@/models/common";

const MdxLinkHead = ({ children }: IHaveChildren) => {
  return (
    <h1
      id=""
      style={{
        fontSize: "30x",
        fontWeight: 600,
        padding: "3px 2px",
        marginTop: "32px",
        marginBottom: "4px",
      }}
    >
      {children}
    </h1>
  );
};

export default MdxLinkHead;
