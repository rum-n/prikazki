'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onFile: (file: File) => void;
  uploading: boolean;
  compact?: boolean;
}

export default function UploadZone({ onFile, uploading, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith('.epub')) onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  if (compact) {
    return (
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground text-sm hover:border-purple-400 hover:text-purple-400 transition-colors disabled:opacity-50 w-full justify-center"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {uploading ? 'Обработване...' : 'Добави приказка (.epub)'}
        <input
          ref={inputRef}
          type="file"
          accept=".epub"
          className="hidden"
          onChange={handleChange}
        />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors',
        dragging ? 'border-purple-400 bg-purple-500/5' : 'border-border hover:border-purple-400',
        uploading && 'pointer-events-none opacity-60'
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      ) : (
        <Upload className="w-12 h-12 text-muted-foreground" />
      )}
      <div className="text-center">
        <p className="font-semibold text-lg">
          {uploading ? 'Обработване на приказката...' : 'Натисни или пусни .epub файл'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">Поддържан формат: EPUB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".epub"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
