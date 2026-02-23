"use client";

import { Share2 } from "lucide-react";
import { ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useLinkShare } from "@/hooks/use-link-share";

interface ShareLinkButtonProps {
  url?: string;
  title?: string;
  text?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  iconOnly?: boolean;
}

export const ShareLinkButton = ({
  url,
  title,
  text,
  label,
  disabled,
  className,
  variant = "outline",
  size = "sm",
  iconOnly = false,
}: ShareLinkButtonProps) => {
  const t = useTranslations("Share");
  const { shareLink } = useLinkShare();

  const handleShare = async () => {
    await shareLink({
      url,
      title: title ?? t("title"),
      text: text ?? t("description"),
    });
  };

  return (
    <Button
      type="button"
      onClick={handleShare}
      disabled={disabled}
      className={className}
      variant={variant}
      size={iconOnly ? "icon-sm" : size}
      aria-label={label ?? t("share")}
      title={label ?? t("share")}
    >
      <Share2 className="h-4 w-4" />
      {!iconOnly && (label ?? t("share"))}
    </Button>
  );
};
