"use client";

import MdxNav from "@/components/mdx/MdxNav";
import MdxProvider from "@/contexts/MdxContext";
import { IHaveChildren } from "@/models/common";
import { debounce } from "@/utils/DebounceUtil";
import Container from "@ui/Container";
import { useEffect, useRef, useState } from "react";

export default function Layout({ children }: IHaveChildren) {
  const [readPerPost, setReadPerPost] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const handleScrollPost = (postHeight: number) => () => {
    if (window.scrollY > 0) {
      const computed = (window.scrollY / postHeight) * 100;
      setReadPerPost(prev => {
        if (computed >= 100) {
          return 100;
        }
        return Math.round((window.scrollY / postHeight) * 100);
      });
    }
  };

  useEffect(() => {
    if (window && ref.current) {
      const event = debounce(handleScrollPost(ref.current?.clientHeight - window.innerHeight), 200);
      window.addEventListener("scroll", event);
      return () => {
        window.removeEventListener("scroll", event);
      };
    }
  }, []);

  return (
    <MdxProvider>
      <progress
        className="w-full h-1 sticky top-0 px-[1em] md:px[2em] rounded-md"
        max={100}
        value={readPerPost}
      >{`${readPerPost}%`}</progress>
      <div className="flex gap-2" ref={ref}>
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
