"use client";

import { useEffect, useState } from "react";
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
}

export const ShareQrDialog = ({
  url,
  title,
  triggerLabel,
  triggerClassName,
}: ShareQrDialogProps) => {
  const t = useTranslations("Share");
  const { resolveUrl, copyLink } = useLinkShare();
  const [resolvedUrl, setResolvedUrl] = useState("");

  useEffect(() => {
    setResolvedUrl(resolveUrl(url));
  }, [resolveUrl, url]);

  const handleCopy = async () => {
    await copyLink({ url: resolvedUrl || resolveUrl(url) });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={triggerClassName}>
          <QrCode className="h-4 w-4" />
          {triggerLabel ?? t("qr")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? t("qrTitle")}</DialogTitle>
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
