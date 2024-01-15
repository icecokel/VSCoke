import { TTextType } from "./type";
import { CSSProperties } from "react";

export const styles: Record<TTextType, CSSProperties> = {
  h1: {
    fontSize: "6rem",
    fontWeight: 300,
    lineHeight: 1.167,
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },
  h2: {
    fontSize: "4.5rem",
    fontWeight: 300,
    lineHeight: 1.2,
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },
  h3: {
    fontSize: "3rem",
    fontWeight: 400,
    lineHeight: 1.167,
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },
  h4: {
    fontSize: "2.125rem",
    fontWeight: 700,
    lineHeight: 1.235,
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },
  h5: {
    fontSize: "1.5rem",
    fontWeight: 700,
    lineHeight: 1.334,
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },
  h6: {
    fontSize: "1.25rem",
    fontWeight: 700,
    lineHeight: 1.6,
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
  },

  body1: {
    lineHeight: 1.5,
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
    fontSize: "1rem",
  },
  body2: {
    lineHeight: 1.5,
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
    fontSize: "0.875rem",
  },
  caption: {
    lineHeight: 1.5,
    fontFamily: "'Spoqa Han Sans Neo', sans-serif",
    fontSize: "0.75rem",
  },
};
