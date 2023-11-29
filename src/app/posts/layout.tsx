"use client";

import { IHaveChildren } from "@/models/common";
import Container from "@mui/material/Container";
import { Metadata } from "next";

export default function Layout({ children }: IHaveChildren) {
  return (
    <Container
      maxWidth="md"
      className="px-[1em] md:px[2em] w-full bg-white text-black/80 rounded-md"
    >
      {children}
    </Container>
  );
}
