'use client';

import { Loader2 } from 'lucide-react';

interface EditableDocumentProps {
  id: string;
  title: string;
  content: string;
  setContent: (content: string) => void;
  isLoading: boolean;
  isFinalized: boolean;
}

export default function EditableDocument({ id, title, content, setContent, isLoading, isFinalized }: EditableDocumentProps) {
  return (
    <div id={id} className="flex-grow bg-gray-50 rounded-lg p-4 border border-border flex flex-col">
      <h3 className="font-semibold mb-2 text-foreground">{title}</h3>
      <div className="flex-grow relative">
        {isLoading ? (
          <div className="absolute inset-0 flex justify-center items-center">
            <Loader2 className="h-6 w-6 animate-spin text-light" />
          </div>
        ) : content ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            readOnly={isFinalized}
            className="w-full h-full bg-transparent text-sm whitespace-pre-wrap font-sans resize-none focus:outline-none p-0 m-0 border-0"
            rows={10}
          />
        ) : (
          <p className="text-sm text-gray-400 italic text-center pt-10">
            O {title.toLowerCase()} gerado pela IA aparecerá aqui.
          </p>
        )}
      </div>
    </div>
  );
}
