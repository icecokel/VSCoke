import { TTextType } from "./type";
import { CSSProperties } from "react";

export const styles: Record<TTextType, CSSProperties> = {
  h1: {
    fontSize: "1.5rem",
    fontWeight: 700,
    marginTop: "1rem",
    marginBottom: "1rem",
    lineHeight: "1.2",
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },
  h2: {
    fontSize: "1.2rem",
    fontWeight: 700,
    marginTop: "1.25rem",
    marginBottom: "1.25rem",
    lineHeight: "1.2",
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },
  h3: {
    fontSize: "1rem",
    fontWeight: 700,
    marginTop: "1.5rem",
    marginBottom: "1.5rem",
    lineHeight: "1.2",
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },
  h4: {
    fontSize: "0.875rem",
    fontWeight: 700,
    marginTop: "1.625rem",
    marginBottom: "1.625rem",
    lineHeight: "1.2",
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },
  h5: {
    fontSize: "0.75rem",
    fontWeight: 700,
    marginTop: "2rem",
    marginBottom: "2rem",
    lineHeight: "1.2",
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },
  h6: {
    fontSize: "0.625rem",
    fontWeight: 700,
    marginTop: "2.375rem",
    marginBottom: "2.375rem",
    lineHeight: "1.2",
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },

  body1: {},
  body2: {},
  caption: {},
};
