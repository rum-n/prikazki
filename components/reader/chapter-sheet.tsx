'use client';

import { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chapter } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentChapter: number;
  onSelect: (index: number) => void;
}

export default function ChapterSheet({
  open,
  onClose,
  chapters,
  currentChapter,
  onSelect,
}: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-30 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-40 bg-background rounded-t-2xl max-h-[75vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-base">Глави</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Затвори"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 pb-safe">
          {chapters.map((chapter, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted transition-colors text-left border-b border-border/40 last:border-0"
            >
              <div className="min-w-0 mr-3">
                <p
                  className={cn(
                    'text-sm truncate',
                    i === currentChapter && 'text-purple-500 font-semibold'
                  )}
                >
                  {chapter.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {chapter.sentences.length} изречения
                </p>
              </div>
              {i === currentChapter && (
                <Check className="w-4 h-4 text-purple-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
