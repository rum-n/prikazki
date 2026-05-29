'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, BookOpen } from 'lucide-react';
import type { Book, Progress } from '@/types';

interface Props {
  book: Book;
  onDelete: (id: string) => void;
}

function getProgress(bookId: string): Progress | null {
  try {
    const raw = localStorage.getItem(`progress_${bookId}`);
    return raw ? (JSON.parse(raw) as Progress) : null;
  } catch {
    return null;
  }
}

function calcProgressPercent(book: Book, progress: Progress | null): number {
  if (!progress) return 0;
  const total = book.chapters.reduce((sum, ch) => sum + ch.sentences.length, 0);
  if (total === 0) return 0;
  let before = 0;
  for (let i = 0; i < progress.chapterIndex; i++) {
    before += book.chapters[i]?.sentences.length ?? 0;
  }
  before += progress.sentenceIndex;
  return Math.round((before / total) * 100);
}

export default function BookCard({ book, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    setProgress(getProgress(book.id));
  }, [book.id]);

  const pct = calcProgressPercent(book, progress);

  return (
    <div className="relative group">
      <Link href={`/read/${book.id}`} className="block">
        <div className="rounded-xl overflow-hidden border border-border bg-card hover:border-purple-400 transition-colors">
          {book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover}
              alt={book.title}
              className="w-full aspect-[2/3] object-cover"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-purple-400" />
            </div>
          )}
          <div className="p-2">
            <p className="text-xs font-semibold line-clamp-2 leading-snug">{book.title}</p>
            {book.author && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
            )}
            {pct > 0 && (
              <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </Link>

      <button
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        onClick={(e) => {
          e.preventDefault();
          setConfirmDelete(true);
        }}
        aria-label="Изтрий"
      >
        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {confirmDelete && (
        <div className="absolute inset-0 rounded-xl bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 z-10">
          <p className="text-xs text-center font-medium">Изтрий &ldquo;{book.title}&rdquo;?</p>
          <div className="flex gap-2">
            <button
              onClick={() => onDelete(book.id)}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white font-medium"
            >
              Изтрий
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-border font-medium"
            >
              Отказ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
