"use client";

import { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { useCustomRouter } from "@/hooks/use-custom-router";

interface CustomLinkProps extends ComponentProps<typeof Link> {
  title?: string;
}

export const CustomLink = ({ href, title, onClick, children, ...props }: CustomLinkProps) => {
  const router = useCustomRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }

    // 특수 키(Ctrl/Cmd 등) 미사용 시 커스텀 라우팅 처리
    if (!e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      // href를 string으로 가정하고 처리
      router.push(href as string, { title });
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
};
