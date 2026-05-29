import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Book } from '@/types';

interface PrikazkiDB extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: { 'by-addedAt': number };
  };
}

let db: IDBPDatabase<PrikazkiDB> | null = null;

async function getDB() {
  if (!db) {
    db = await openDB<PrikazkiDB>('prikazki', 1, {
      upgrade(database) {
        const store = database.createObjectStore('books', { keyPath: 'id' });
        store.createIndex('by-addedAt', 'addedAt');
      },
    });
  }
  return db;
}

export async function saveBook(book: Book): Promise<void> {
  const database = await getDB();
  await database.put('books', book);
}

export async function getBook(id: string): Promise<Book | undefined> {
  const database = await getDB();
  return database.get('books', id);
}

export async function getAllBooks(): Promise<Book[]> {
  const database = await getDB();
  const books = await database.getAllFromIndex('books', 'by-addedAt');
  return books.reverse();
}

export async function deleteBook(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('books', id);
}
