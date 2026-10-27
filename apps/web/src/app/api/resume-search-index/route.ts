import { NextRequest, NextResponse } from "next/server";
import { buildResumeSearchItems } from "@/features/resume/lib/search-index";
import { routing } from "@/i18n/routing";
import { getResumeDocument } from "@/services/resume-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale =
    routing.locales.find(candidate => candidate === requestedLocale) ?? routing.defaultLocale;
  const document = await getResumeDocument(locale);
  return NextResponse.json({ data: buildResumeSearchItems(document) });
}
