'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Moon, Sun } from 'lucide-react';
import { getAllBooks, saveBook, deleteBook } from '@/lib/db';
import { parseEpub } from '@/lib/epub';
import BookCard from '@/components/book-card';
import UploadZone from '@/components/upload-zone';
import type { Book } from '@/types';

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    getAllBooks()
      .then(setBooks)
      .finally(() => setLoading(false));
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const book = await parseEpub(file);
      await saveBook(book);
      setBooks((prev) => [book, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка при обработването на файла.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteBook(id);
    localStorage.removeItem(`progress_${id}`);
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-500" />
          <h1 className="text-lg font-bold tracking-tight">Приказки</h1>
        </div>
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Смени тема"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-12">
            <p className="text-muted-foreground text-sm text-center">
              Добави първата приказка
            </p>
            <UploadZone onFile={handleFile} uploading={uploading} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {books.map((book) => (
                <BookCard key={book.id} book={book} onDelete={handleDelete} />
              ))}
            </div>
            <div className="mt-6">
              <UploadZone onFile={handleFile} uploading={uploading} compact />
            </div>
          </>
        )}

        {error && (
          <p className="mt-4 text-sm text-destructive text-center">{error}</p>
        )}
      </div>
    </main>
  );
}
