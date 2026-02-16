export type SearchItemType = "blog" | "profile" | "game";

export interface SearchItem {
  id: string;
  type: SearchItemType;
  title: string;
  path: string;
  description?: string;
  keywords?: string[];
  priority?: number;
  featured?: boolean;
}
