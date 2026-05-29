'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  sentences: string[];
  currentIndex: number;
  onTap: (index: number) => void;
}

export default function SentenceView({ sentences, currentIndex, onTap }: Props) {
  const currentRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentIndex]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10 space-y-5">
      {sentences.map((sentence, i) => {
        const dist = Math.abs(i - currentIndex);
        const isCurrent = dist === 0;
        const opacity = isCurrent ? 1 : dist === 1 ? 0.4 : dist === 2 ? 0.2 : 0.1;

        return (
          <button
            key={i}
            ref={isCurrent ? currentRef : null}
            onClick={() => onTap(i)}
            className={cn(
              'block w-full text-left transition-all duration-500 rounded-xl px-3 py-2',
              isCurrent && 'bg-purple-500/5'
            )}
            style={{ opacity }}
          >
            <span
              className={cn(
                'leading-relaxed tracking-wide',
                isCurrent ? 'text-2xl font-semibold text-foreground' : 'text-lg text-muted-foreground'
              )}
            >
              {sentence}
            </span>
          </button>
        );
      })}
    </div>
  );
}
