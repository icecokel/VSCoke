import { TButtonType } from "./type";
import { colors } from "@/styles/colors";
import { CSSProperties } from "react";

// TODO hover, disabled 적용 방법 고민
const DEFAULT_STYLE: CSSProperties = {
  color: colors.yellow[200],
  fontWeight: 600,
  padding: "0.75em 1em",
  borderRadius: "4px",
};

export const styles: Record<TButtonType, CSSProperties> = {
  text: {
    ...DEFAULT_STYLE,
  },
  contained: {
    ...DEFAULT_STYLE,
    color: colors.black,
    backgroundColor: colors.yellow[200],
  },
  outline: {
    ...DEFAULT_STYLE,
    border: `1px solid`,
  },
};
