import type { Book, Chapter } from '@/types';

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function parseEpub(file: File): Promise<Book> {
  // Lazy import so epubjs never runs on the server
  const ePub = (await import('epubjs')).default;

  const arrayBuffer = await file.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const book = ePub(arrayBuffer as any);
  await book.ready;

  // Cover
  let cover: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coverUrl = await (book as any).coverUrl();
    if (coverUrl) {
      const response = await fetch(coverUrl);
      const blob = await response.blob();
      cover = await blobToBase64(blob);
    }
  } catch {
    // no cover
  }

  // Metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = (await book.loaded.metadata) as any;
  const title = (metadata?.title as string) || file.name.replace(/\.epub$/i, '');
  const author = metadata?.creator as string | undefined;

  // Build TOC href → label map
  const navMap = new Map<string, string>();
  try {
    await book.loaded.navigation;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walkToc = (items: any[]) => {
      for (const item of items) {
        if (item.href) navMap.set(item.href.split('#')[0], item.label?.trim() || '');
        if (item.subitems?.length) walkToc(item.subitems);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walkToc((book as any).navigation?.toc || []);
  } catch {
    // navigation not available
  }

  // Parse spine items into chapters
  const chapters: Chapter[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spine = (book as any).spine;
  const spineItems = spine?.spineItems || spine?.items || [];

  for (const item of spineItems) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await item.load((book as any).load.bind(book));
      const doc = item.document as Document | null;

      if (!doc?.body) {
        item.unload?.();
        continue;
      }

      const nodes = Array.from(doc.querySelectorAll('p, h1, h2, h3, h4, blockquote'));
      const texts = nodes
        .map((el) => el.textContent?.trim() || '')
        .filter((t) => t.length > 0);

      const sentences: string[] = [];
      for (const text of texts) {
        sentences.push(...splitIntoSentences(text));
      }

      if (sentences.length < 2) {
        item.unload?.();
        continue;
      }

      const itemHref = (item.href as string | undefined)?.split('#')[0] || '';
      const tocTitle = navMap.get(itemHref) || '';
      const headingTitle = doc.querySelector('h1, h2, h3')?.textContent?.trim() || '';
      const chapterTitle = tocTitle || headingTitle || `Глава ${chapters.length + 1}`;

      chapters.push({ title: chapterTitle, sentences });
      item.unload?.();
    } catch {
      try { item.unload?.(); } catch { /* ignore */ }
    }
  }

  if (chapters.length === 0) {
    throw new Error('Не можах да извлека текст от този EPUB файл.');
  }

  return {
    id: crypto.randomUUID(),
    title,
    author,
    cover,
    chapters,
    addedAt: Date.now(),
  };
}
