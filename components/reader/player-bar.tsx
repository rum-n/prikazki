'use client';

import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Loader2, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerState } from '@/types';

interface Props {
  state: PlayerState;
  sentenceIndex: number;
  totalSentences: number;
  speed: number;
  sleepSecondsLeft: number | null;
  onPlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSpeedChange: (speed: number) => void;
  onSleepTimer: (minutes: number | null) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];
const SLEEP_OPTIONS = [10, 20, 30];

export default function PlayerBar({
  state,
  sentenceIndex,
  totalSentences,
  speed,
  sleepSecondsLeft,
  onPlay,
  onPrev,
  onNext,
  onSpeedChange,
  onSleepTimer,
}: Props) {
  const [showSpeed, setShowSpeed] = useState(false);
  const [showSleep, setShowSleep] = useState(false);

  const progress = totalSentences > 0 ? (sentenceIndex / totalSentences) * 100 : 0;
  const isLoading = state === 'loading';
  const isPlaying = state === 'playing';

  function formatSleep(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="shrink-0 border-t border-border bg-background px-5 pt-3 pb-8">
      {/* Chapter progress bar */}
      <div className="h-0.5 rounded-full bg-muted mb-4 overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center mb-4 tabular-nums">
        {sentenceIndex + 1} / {totalSentences}
      </p>

      <div className="flex items-center justify-between">
        {/* Speed control */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSpeed((v) => !v);
              setShowSleep(false);
            }}
            className="text-xs font-mono px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors min-w-[48px] text-center"
          >
            ×{speed}
          </button>
          {showSpeed && (
            <div className="absolute bottom-full mb-2 left-0 flex gap-1 bg-popover border border-border rounded-xl p-1.5 shadow-xl z-20">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onSpeedChange(s);
                    setShowSpeed(false);
                  }}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors',
                    speed === s ? 'bg-purple-500 text-white' : 'hover:bg-muted'
                  )}
                >
                  ×{s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main controls */}
        <div className="flex items-center gap-5">
          <button
            onClick={onPrev}
            disabled={isLoading}
            className="p-2 text-foreground disabled:opacity-40 active:scale-90 transition-transform touch-manipulation"
            aria-label="Предишно изречение"
          >
            <SkipBack className="w-7 h-7" />
          </button>

          <button
            onClick={onPlay}
            disabled={isLoading}
            className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 active:scale-95 transition-transform disabled:opacity-70 touch-manipulation"
            aria-label={isPlaying ? 'Пауза' : 'Пусни'}
          >
            {isLoading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-1" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={isLoading}
            className="p-2 text-foreground disabled:opacity-40 active:scale-90 transition-transform touch-manipulation"
            aria-label="Следващо изречение"
          >
            <SkipForward className="w-7 h-7" />
          </button>
        </div>

        {/* Sleep timer */}
        <div className="relative">
          <button
            onClick={() => {
              if (sleepSecondsLeft !== null) {
                onSleepTimer(null);
                return;
              }
              setShowSleep((v) => !v);
              setShowSpeed(false);
            }}
            className={cn(
              'flex flex-col items-center gap-0.5 min-w-[48px] p-1 rounded-lg transition-colors touch-manipulation',
              sleepSecondsLeft !== null
                ? 'text-purple-500'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Таймер за сън"
          >
            <Timer className="w-5 h-5" />
            {sleepSecondsLeft !== null && (
              <span className="text-[10px] font-mono leading-none">
                {formatSleep(sleepSecondsLeft)}
              </span>
            )}
          </button>
          {showSleep && (
            <div className="absolute bottom-full mb-2 right-0 flex gap-1 bg-popover border border-border rounded-xl p-1.5 shadow-xl z-20">
              {SLEEP_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    onSleepTimer(m);
                    setShowSleep(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors"
                >
                  {m}м
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
