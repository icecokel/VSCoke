"use client";

import MdxNav from "@/components/mdx/MdxNav";
import MdxProvider from "@/contexts/MdxContext";
import { IHaveChildren } from "@/models/common";
import Container from "@ui/Container";

export default function Layout({ children }: IHaveChildren) {
  return (
    <MdxProvider>
      <div className="flex gap-2">
        <Container
          maxWidth="md"
          className="px-[1em] md:px[2em] w-full bg-white text-black/80 rounded-md"
        >
          {children}
        </Container>
        <MdxNav />
      </div>
    </MdxProvider>
  );
}
