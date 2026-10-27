import { NextRequest, NextResponse } from "next/server";
import { buildResumeSearchItems } from "@/features/resume/lib/search-index";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api-client";
import { getResumeDocument } from "@/services/resume-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale = requestedLocale ?? routing.defaultLocale;
  if (!routing.locales.some(candidate => candidate === locale)) {
    return NextResponse.json({ data: [] }, { status: 404 });
  }
  try {
    const document = await getResumeDocument(
      locale,
      (request.nextUrl.searchParams.getAll("resume").length > 1
        ? ""
        : request.nextUrl.searchParams.get("resume")) ?? "pe",
    );
    return NextResponse.json({ data: buildResumeSearchItems(document) });
  } catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ data: [] }, { status: error.status });
    throw error;
  }
}
