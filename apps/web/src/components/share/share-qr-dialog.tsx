"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QrCode, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLinkShare } from "@/hooks/use-link-share";

interface ShareQrDialogProps {
  url?: string;
  title?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerLabelClassName?: string;
}

export const ShareQrDialog = ({
  url,
  title,
  triggerLabel,
  triggerClassName,
  triggerLabelClassName,
}: ShareQrDialogProps) => {
  const t = useTranslations("Share");
  const tCommon = useTranslations("common");
  const { resolveUrl, copyLink } = useLinkShare();
  const [resolvedUrl, setResolvedUrl] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResolvedUrl(resolveUrl(url));
  }, [resolveUrl, url]);

  const handleCopy = async () => {
    await copyLink({ url: resolvedUrl || resolveUrl(url) });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={triggerClassName}
          aria-label={triggerLabel ?? t("qr")}
          title={triggerLabel ?? t("qr")}
        >
          <QrCode aria-hidden="true" className="h-4 w-4" />
          <span className={triggerLabelClassName}>{triggerLabel ?? t("qr")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        closeLabel={tCommon("close")}
        ref={dialogRef}
        tabIndex={-1}
        onOpenAutoFocus={event => {
          event.preventDefault();
          dialogRef.current?.focus({ preventScroll: true });
        }}
        onFocusCapture={event => {
          const dialog = event.currentTarget;
          const target = event.target;
          if (target === dialog) return;
          const bounds = dialog.getBoundingClientRect();
          const focused = target.getBoundingClientRect();
          const inset = 4;
          if (focused.top < bounds.top + inset) {
            dialog.scrollTop -= bounds.top + inset - focused.top;
          } else if (focused.bottom > bounds.bottom - inset) {
            dialog.scrollTop += focused.bottom - bounds.bottom + inset;
          }
        }}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
      >
        <DialogHeader className="pr-6">
          <DialogTitle className="break-words">{title ?? t("qrTitle")}</DialogTitle>
          <DialogDescription>{t("qrDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border border-white/10 bg-white p-4">
            <QRCodeSVG value={resolvedUrl || "about:blank"} size={220} includeMargin />
          </div>

          <p
            className="w-full whitespace-pre-wrap break-all text-center text-sm leading-relaxed text-muted-foreground"
            title={resolvedUrl}
          >
            {resolvedUrl}
          </p>

          <Button type="button" onClick={handleCopy} className="w-full">
            <Copy className="h-4 w-4" />
            {t("copyLink")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
