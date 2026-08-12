"use client";

import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CustomLink } from "@/components/custom-link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { downloadResumePdf } from "@/features/resume-preview/lib/resume-pdf";

type PdfDownloadState = "idle" | "saving" | "error";

export const ResumePreviewActions = () => {
  const t = useTranslations("resumePreview");
  const [downloadState, setDownloadState] = useState<PdfDownloadState>("idle");
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);

  const handleSavePdf = async (includeCareerDetails: boolean) => {
    setIsDownloadDialogOpen(false);

    const resumeDocument = document.querySelector<HTMLElement>(".resume-preview-document");
    const careerDetailDocuments = includeCareerDetails
      ? Array.from(document.querySelectorAll<HTMLElement>(".resume-preview-career-detail-document"))
      : [];

    if (!resumeDocument || (includeCareerDetails && careerDetailDocuments.length === 0)) {
      setDownloadState("error");
      return;
    }

    setDownloadState("saving");

    try {
      await downloadResumePdf(resumeDocument, careerDetailDocuments);
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
    }
  };

  const isSavingPdf = downloadState === "saving";

  return (
    <div className="resume-preview-toolbar relative mx-auto mb-4 min-h-9 w-full max-w-[210mm]">
      <div className="pr-32">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-200">
          {t("previewLabel")}
        </p>
        <p className="mt-1 text-sm text-gray-400">{t("saveHint")}</p>
        {downloadState === "error" && (
          <p className="mt-1 text-sm text-red-400" role="alert">
            {t("savePdfFailed")}
          </p>
        )}
      </div>
      <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            className="absolute top-0 right-0 bg-blue-300 text-gray-900 hover:bg-blue-200"
            data-testid="resume-preview-save-pdf"
            disabled={isSavingPdf}
          >
            <DownloadIcon className="size-4" aria-hidden="true" />
            {isSavingPdf ? t("savingPdf") : t("savePdf")}
          </Button>
        </DialogTrigger>
        <DialogContent
          className="border-gray-600 bg-gray-800 text-gray-100 sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>{t("downloadDialogTitle")}</DialogTitle>
            <DialogDescription>{t("downloadDialogDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t("cancelDownload")}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              data-testid="resume-preview-download-resume-only"
              onClick={() => handleSavePdf(false)}
            >
              {t("downloadResumeOnly")}
            </Button>
            <Button
              type="button"
              className="bg-blue-300 text-gray-900 hover:bg-blue-200"
              data-testid="resume-preview-download-with-career-details"
              onClick={() => handleSavePdf(true)}
            >
              {t("downloadWithCareerDetails")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CustomLink
        href="/readme"
        title="README"
        className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-600 px-3 text-sm font-medium text-gray-100 transition-colors hover:border-gray-400 hover:bg-gray-800"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        {t("backToWebResume")}
      </CustomLink>
    </div>
  );
};
