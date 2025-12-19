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

    // Ctrl/Cmd 키나 Shift 키 등을 누른 상태가 아닐 때만 커스텀 라우팅 처리
    if (!e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      // href가 객체인 경우 등은 복잡해질 수 있으므로 string으로 단언하거나 처리 필요
      // next-intl Link의 href는 string | UrlObject 일 수 있음.
      // 여기서는 간단히 string으로 가정하거나 router.push에 그대로 전달
      // router.push는 string만 받는 경우가 많으므로 주의.
      // 현재 프로젝트는 href를 string으로만 쓰고 있음.
      router.push(href as string, { title });
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
};
