import type { components, operations } from "@/types/api";
import { apiClient } from "@/lib/api-client";

type GeekNewsGetLatestArticlesOperation = operations["GeekNewsController_getLatestArticles"];
type GeekNewsSyncLatestTopicsOperation = operations["GeekNewsController_syncLatestTopics"];

export type GeekNewsArticleResponseDto = components["schemas"]["GeekNewsArticleResponseDto"];
export type GeekNewsSyncResponseDto = components["schemas"]["GeekNewsSyncResponseDto"];

export type GetLatestGeekNewsArticlesRequest =
  GeekNewsGetLatestArticlesOperation["parameters"]["query"];
export type GetLatestGeekNewsArticlesResponse =
  GeekNewsGetLatestArticlesOperation["responses"][200]["content"]["application/json"];

export type SyncLatestGeekNewsResponse =
  GeekNewsSyncLatestTopicsOperation["responses"][200]["content"]["application/json"];

/**
 * 저장된 긱뉴스 번역 결과를 최신순으로 조회합니다.
 */
export const getLatestGeekNewsArticles = async ({
  limit,
}: GetLatestGeekNewsArticlesRequest): Promise<GetLatestGeekNewsArticlesResponse> => {
  const searchParams = new URLSearchParams({
    limit: String(limit),
  });

  return apiClient.get<GetLatestGeekNewsArticlesResponse>(
    `/geeknews/articles?${searchParams.toString()}`,
    {
      next: { revalidate: 300 },
    },
  );
};

/**
 * 긱뉴스 최신 글을 수동으로 동기화합니다.
 */
export const syncLatestGeekNewsArticles = async (): Promise<SyncLatestGeekNewsResponse> => {
  return apiClient.post<SyncLatestGeekNewsResponse>("/geeknews/sync");
};
