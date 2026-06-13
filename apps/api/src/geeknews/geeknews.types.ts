export type GeekNewsTranslationStatus = 'pending' | 'translated' | 'failed';

export interface GeekNewsTopicSummary {
  topicId: number;
  topicUrl: string;
  sourceUrl: string | null;
  title: string;
  summary: string;
  author: string;
  points: number;
  commentCount: number;
  rank: number;
  listedAtText: string;
}

export interface GeekNewsTopicDetail extends GeekNewsTopicSummary {
  content: string;
  postedAt: Date | null;
}

export interface GeekNewsTranslationRequest {
  title: string;
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface GeekNewsTranslatedContent {
  provider: string;
  model: string;
  targetLanguage: string;
  translatedTitle: string;
  translatedContent: string;
}

export interface GeekNewsArticleRecord {
  id: string;
  sourceTopicId: number;
  topicUrl: string;
  sourceUrl: string | null;
  title: string;
  content: string;
  translatedTitle: string | null;
  translatedContent: string | null;
  author: string;
  points: number;
  commentCount: number;
  rank: number;
  listedAtText: string;
  postedAt: Date | null;
  sourceLanguage: string;
  translatedLanguage: string | null;
  translationStatus: GeekNewsTranslationStatus;
  translationProvider: string | null;
  translationModel: string | null;
  translationError: string | null;
  translatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeekNewsSyncResult {
  status: 'completed' | 'skipped';
  reason?: 'sync_in_progress';
  crawledPages: number;
  crawledTopics: number;
  createdTopics: number;
  updatedTopics: number;
  skippedTopics: number;
  translatedTopics: number;
  pendingTopics: number;
  failedTopics: number;
  articles: GeekNewsArticleRecord[];
}
