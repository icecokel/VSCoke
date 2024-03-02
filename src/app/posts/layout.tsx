"use client";

import MdxNav from "@/components/mdx/MdxNav";
import MdxProgressBar from "@/components/mdx/MdxProgressBar";
import MdxProvider from "@/contexts/MdxContext";
import { IHaveChildren } from "@/models/common";
import { debounce } from "@/utils/DebounceUtil";
import Container from "@ui/Container";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_TIME = 200;

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
      const event = debounce(
        handleScrollPost(ref.current?.clientHeight - window.innerHeight),
        DEBOUNCE_TIME,
      );
      window.addEventListener("scroll", event);
      return () => {
        window.removeEventListener("scroll", event);
      };
    }
  }, []);

  return (
    <MdxProvider>
      <div className="flex" ref={ref}>
        <Container
          maxWidth="md"
          className="px-[1em] md:px[2em] w-full bg-white text-black/80 rounded-md"
        >
          <MdxProgressBar max={100} value={readPerPost}>{`${readPerPost}%`}</MdxProgressBar>
          {children}
        </Container>
        <MdxNav />
      </div>
    </MdxProvider>
  );
}
