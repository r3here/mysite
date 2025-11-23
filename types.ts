
export type ItemType = 'link' | 'note' | 'snippet';

export interface VaultItem {
  id: string;
  type: ItemType;
  content: string; // The URL or the main text
  title: string;
  summary?: string;
  tags: string[];
  createdAt: number;
}

export interface AppConfig {
  apiEndpoint?: string; // Empty means local mode
  authToken?: string;
}

export interface AiAnalysisResult {
  title: string;
  summary: string;
  tags: string[];
  type: ItemType;
}

// For Drag and Drop
export const DND_ITEM_TYPE = 'VAULT_ITEM';
export interface DragItem {
  id: string;
  type: string;
}
