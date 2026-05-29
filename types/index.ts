export interface Chapter {
  title: string;
  sentences: string[];
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  cover?: string; // base64 data URL
  chapters: Chapter[];
  addedAt: number;
}

export interface Progress {
  chapterIndex: number;
  sentenceIndex: number;
  updatedAt: number;
}

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
