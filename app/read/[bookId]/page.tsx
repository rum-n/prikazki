'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, List, Moon, Sun } from 'lucide-react';
import { getBook } from '@/lib/db';
import SentenceView from '@/components/reader/sentence-view';
import PlayerBar from '@/components/reader/player-bar';
import ChapterSheet from '@/components/reader/chapter-sheet';
import type { Book, Progress, PlayerState } from '@/types';

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState<number | null>(null);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speedRef = useRef(speed);
  // Cache of sentenceKey → object URL
  const audioCache = useRef<Map<string, string>>(new Map());
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track whether auto-advance is active (allows pause to cancel it)
  const autoAdvanceRef = useRef(false);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));

    if (!bookId) return;

    getBook(bookId).then((b) => {
      if (!b) {
        router.replace('/');
        return;
      }
      setBook(b);

      try {
        const raw = localStorage.getItem(`progress_${bookId}`);
        if (raw) {
          const p = JSON.parse(raw) as Progress;
          // Validate indices are still in range
          const ci = Math.min(p.chapterIndex, b.chapters.length - 1);
          const si = Math.min(p.sentenceIndex, (b.chapters[ci]?.sentences.length ?? 1) - 1);
          setChapterIndex(ci);
          setSentenceIndex(si);
        }
      } catch {
        // ignore corrupt progress
      }
    });

    return () => {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    };
  }, [bookId, router]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // ── Sync speed ref ────────────────────────────────────────────────────────

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // ── Persist progress ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!bookId || !book) return;
    const p: Progress = { chapterIndex, sentenceIndex, updatedAt: Date.now() };
    localStorage.setItem(`progress_${bookId}`, JSON.stringify(p));
  }, [bookId, book, chapterIndex, sentenceIndex]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  const advance = useCallback(
    (ci: number, si: number): { ci: number; si: number } | null => {
      if (!book) return null;
      const chapter = book.chapters[ci];
      if (si + 1 < chapter.sentences.length) return { ci, si: si + 1 };
      if (ci + 1 < book.chapters.length) return { ci: ci + 1, si: 0 };
      return null;
    },
    [book]
  );

  async function fetchAudio(ci: number, si: number): Promise<string> {
    const key = `${ci}:${si}`;
    const cached = audioCache.current.get(key);
    if (cached) return cached;

    const sentence = book!.chapters[ci]?.sentences[si];
    if (!sentence) throw new Error('No sentence');

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sentence }),
    });

    if (!res.ok) throw new Error(await res.text());

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioCache.current.set(key, url);
    return url;
  }

  function prefetchNext(ci: number, si: number) {
    if (!book) return;
    const next = advance(ci, si);
    if (!next) return;
    const key = `${next.ci}:${next.si}`;
    if (!audioCache.current.has(key)) {
      fetchAudio(next.ci, next.si).catch(() => {});
    }
  }

  // ── Core play logic ───────────────────────────────────────────────────────

  async function playSentence(ci: number, si: number, shouldAutoAdvance: boolean) {
    if (!book || !audioRef.current) return;

    setChapterIndex(ci);
    setSentenceIndex(si);
    setPlayerState('loading');
    autoAdvanceRef.current = shouldAutoAdvance;

    try {
      setTtsError(null);
      const url = await fetchAudio(ci, si);

      // User may have paused while we were fetching
      if (!autoAdvanceRef.current && shouldAutoAdvance) return;

      prefetchNext(ci, si);

      const audio = audioRef.current;
      audio.src = url;
      audio.playbackRate = speedRef.current;

      audio.onended = () => {
        if (!autoAdvanceRef.current) {
          setPlayerState('idle');
          return;
        }
        const next = advance(ci, si);
        if (next) {
          playSentence(next.ci, next.si, true);
        } else {
          setPlayerState('idle');
          autoAdvanceRef.current = false;
        }
      };

      audio.onerror = () => setPlayerState('error');

      await audio.play();
      setPlayerState('playing');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTtsError(msg);
      setPlayerState('error');
    }
  }

  // ── Player controls ───────────────────────────────────────────────────────

  function handlePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playerState === 'playing') {
      audio.pause();
      autoAdvanceRef.current = false;
      setPlayerState('paused');
    } else if (playerState === 'paused') {
      autoAdvanceRef.current = true;
      audio.play().then(() => setPlayerState('playing'));
    } else {
      playSentence(chapterIndex, sentenceIndex, true);
    }
  }

  function handlePrev() {
    if (!book) return;
    audioRef.current?.pause();
    autoAdvanceRef.current = false;

    let ci = chapterIndex;
    let si = sentenceIndex - 1;
    if (si < 0) {
      ci = Math.max(0, ci - 1);
      si = (book.chapters[ci]?.sentences.length ?? 1) - 1;
    }

    const wasPlaying = playerState === 'playing';
    setChapterIndex(ci);
    setSentenceIndex(si);
    setPlayerState('idle');
    if (wasPlaying) playSentence(ci, si, true);
  }

  function handleNext() {
    audioRef.current?.pause();
    autoAdvanceRef.current = false;

    const next = advance(chapterIndex, sentenceIndex);
    if (!next) return;

    const wasPlaying = playerState === 'playing';
    setChapterIndex(next.ci);
    setSentenceIndex(next.si);
    setPlayerState('idle');
    if (wasPlaying) playSentence(next.ci, next.si, true);
  }

  function handleSentenceTap(i: number) {
    const wasPlaying = playerState === 'playing';
    audioRef.current?.pause();
    autoAdvanceRef.current = false;
    setSentenceIndex(i);
    setPlayerState('idle');
    if (wasPlaying) playSentence(chapterIndex, i, true);
  }

  function handleSpeedChange(newSpeed: number) {
    setSpeed(newSpeed);
    speedRef.current = newSpeed;
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  }

  function handleSleepTimer(minutes: number | null) {
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }
    setSleepSecondsLeft(null);

    if (!minutes) return;

    let secondsLeft = minutes * 60;
    setSleepSecondsLeft(secondsLeft);

    sleepIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(sleepIntervalRef.current!);
        sleepIntervalRef.current = null;
        setSleepSecondsLeft(null);
        audioRef.current?.pause();
        autoAdvanceRef.current = false;
        setPlayerState('paused');
      } else {
        setSleepSecondsLeft(secondsLeft);
      }
    }, 1000);
  }

  function handleChapterSelect(ci: number) {
    audioRef.current?.pause();
    autoAdvanceRef.current = false;
    setChapterIndex(ci);
    setSentenceIndex(0);
    setPlayerState('idle');
    setChapterOpen(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const currentSentences = book.chapters[chapterIndex]?.sentences ?? [];

  return (
    <main className="flex flex-col h-dvh bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 -ml-1.5 touch-manipulation"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 mx-3 min-w-0 text-center">
          <p className="text-sm font-semibold truncate">{book.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {book.chapters[chapterIndex]?.title}
          </p>
        </div>

        <div className="flex gap-1 items-center">
          <button
            onClick={toggleDark}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            aria-label="Смени тема"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setChapterOpen(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            aria-label="Глави"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sentence view */}
      <SentenceView
        sentences={currentSentences}
        currentIndex={sentenceIndex}
        onTap={handleSentenceTap}
      />

      {/* TTS error banner */}
      {ttsError && (
        <div className="shrink-0 mx-4 mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          {ttsError}
        </div>
      )}

      {/* Player */}
      <PlayerBar
        state={playerState}
        sentenceIndex={sentenceIndex}
        totalSentences={currentSentences.length}
        speed={speed}
        sleepSecondsLeft={sleepSecondsLeft}
        onPlay={handlePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onSpeedChange={handleSpeedChange}
        onSleepTimer={handleSleepTimer}
      />

      {/* Chapter sheet */}
      <ChapterSheet
        open={chapterOpen}
        onClose={() => setChapterOpen(false)}
        chapters={book.chapters}
        currentChapter={chapterIndex}
        onSelect={handleChapterSelect}
      />
    </main>
  );
}
