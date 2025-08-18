'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Mic, MicOff } from 'lucide-react';

// O 'speaker' agora é genérico, pois a IA fará a distinção
export type TranscriptItem = {
  speaker: 'Transcrição';
  text: string;
};

interface BackgroundTranscriberProps {
  isListening: boolean;
  onToggleListening: () => void;
  onTranscriptUpdate: (item: TranscriptItem) => void;
}

export default function BackgroundTranscriber({ isListening, onToggleListening, onTranscriptUpdate }: BackgroundTranscriberProps) {
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("O seu navegador não suporta a transcrição em tempo real. Tente o Google Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const text = lastResult[0].transcript.trim();
        if (text) {
          // Envia o texto com um locutor genérico
          onTranscriptUpdate({ speaker: 'Transcrição', text });
        }
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event);
      toast.error(`Erro na transcrição: ${event.error}`);
    };

    recognitionRef.current = recognition;
  }, [onTranscriptUpdate]);

  useEffect(() => {
    if (isListening) {
      recognitionRef.current?.start();
    } else {
      recognitionRef.current?.stop();
    }
  }, [isListening]);

  return (
    <div className="p-6 rounded-lg border border-border bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mic className="h-6 w-6 text-light" />
          <h2 className="text-xl font-semibold">Transcrição</h2>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Ícone de microfone a piscar quando a gravação está ativa */}
          {isListening && (
            <div className="flex items-center gap-2 text-red-500">
              <Mic className="h-5 w-5 animate-pulse" />
              <span className="text-sm font-medium">A gravar...</span>
            </div>
          )}
          
          <button
            onClick={onToggleListening}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-white font-semibold transition-colors ${
              isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-light hover:bg-brand-dark'
            }`}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {isListening ? 'Finalizar' : 'Iniciar Consulta de Voz'}
          </button>
        </div>
      </div>
    </div>
  );
}
