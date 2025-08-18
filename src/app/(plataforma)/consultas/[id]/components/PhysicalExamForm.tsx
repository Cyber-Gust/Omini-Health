'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

// ESTRUTURA DE DADOS EXPANDIDA: Cada item agora tem um estado "normal" e "alterações"
const examData = {
  'Geral': [
    { finding: 'Estado Geral', normal: 'BEG', alterations: ['REG', 'MEG'] },
    { finding: 'Nível de Consciência', normal: 'LOTE', alterations: ['Confuso(a)', 'Sonolento(a)', 'Glasgow < 15'] },
    { finding: 'Hidratação', normal: 'Hidratado(a)', alterations: ['Desidratado(a) +/4+', 'Desidratado(a) ++/4+'] },
    { finding: 'Coloração', normal: 'Corado(a)', alterations: ['Hipocorado(a) +/4+', 'Hipocorado(a) ++/4+'] },
    { finding: 'Icterícia', normal: 'Anictérico(a)', alterations: ['Ictérico(a) +/4+', 'Ictérico(a) ++/4+'] },
    { finding: 'Cianose', normal: 'Acianótico(a)', alterations: ['Cianose central', 'Cianose periférica'] },
    { finding: 'Febre', normal: 'Afebril', alterations: ['Febril'] },
  ],
  'Aparelho Cardiovascular (ACV)': [
    { finding: 'Ritmo Cardíaco', normal: 'RCR', alterations: ['RCA'] },
    { finding: 'Bulhas', normal: 'BNRNF', alterations: ['Hipofonéticas', 'Hiperfonéticas'] },
    { finding: 'Sopros', normal: 'Sem sopros', alterations: ['Sopro sistólico', 'Sopro diastólico'] },
  ],
  'Aparelho Respiratório (AR)': [
    { finding: 'Murmúrio Vesicular (MV)', normal: 'MVF s/ RA ', alterations: ['MV diminuído', 'MV abolido'] },
    { finding: 'Ruídos Adventícios', normal: 'Nenhum', alterations: ['Estertores', 'Sibilos', 'Roncos'] },
  ],
  'Abdômen (ABD)': [
      { finding: 'Inspeção', normal: 'Plano e flácido', alterations: ['Globoso', 'Distendido'] },
      { finding: 'Palpação', normal: 'Indolor à palpação', alterations: ['Doloroso à palpação superficial', 'Doloroso à palpação profunda'] },
      { finding: 'Ruídos Hidroaéreos (RHA)', normal: 'RHA+', alterations: ['RHA aumentados', 'RHA diminuídos'] },
  ]
};

type ExamFindings = Record<string, string>;
type OnChangePayload = Record<string, string[]>;

interface PhysicalExamFormProps {
  onExamDataChange: (data: OnChangePayload) => void;
}

// Função para obter o estado inicial com todos os "normais" selecionados
const getInitialState = () => {
  const initialState: ExamFindings = {};
  Object.values(examData).forEach(category => {
    category.forEach(item => {
      initialState[item.finding] = item.normal;
    });
  });
  return initialState;
};

export default function PhysicalExamForm({ onExamDataChange }: PhysicalExamFormProps) {
  const [selectedFindings, setSelectedFindings] = useState<ExamFindings>(getInitialState);
  // CORREÇÃO: O estado inicial agora é um objeto vazio, mantendo todas as abas fechadas.
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // Envia os dados para a página pai sempre que houver uma alteração
  useEffect(() => {
    const payload: OnChangePayload = {};
    Object.entries(selectedFindings).forEach(([finding, value]) => {
      const category = Object.keys(examData).find(cat => (examData as any)[cat].some((item: any) => item.finding === finding)) || 'Outros';
      if (!payload[category]) {
        payload[category] = [];
      }
      payload[category].push(value);
    });
    onExamDataChange(payload);
  }, [selectedFindings, onExamDataChange]);

  const handleFindingChange = (finding: string, value: string) => {
    setSelectedFindings(prev => ({ ...prev, [finding]: value }));
  };

  return (
    <div className="p-6 rounded-lg border border-border bg-white shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Exame Físico</h2>      
      <div className="space-y-6">
        {Object.entries(examData).map(([category, items]) => (
          <div key={category}>
            <button onClick={() => setOpenCategories(p => ({...p, [category]: !p[category]}))} className="w-full flex justify-between items-center text-left font-semibold mb-2 p-1">
              {category}
              {openCategories[category] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {openCategories[category] && (
              <div className="space-y-4 pl-2 border-l-2 border-border ml-1">
                {items.map(({ finding, normal, alterations }) => (
                  <div key={finding}>
                    <label className="block text-sm font-medium text-foreground mb-2">{finding}</label>
                    <div className="flex flex-wrap gap-2">
                      {/* Botão para o estado normal */}
                      <button
                        type="button"
                        onClick={() => handleFindingChange(finding, normal)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          selectedFindings[finding] === normal
                            ? 'bg-light text-white font-semibold'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {normal}
                      </button>
                      {/* Botões para as alterações */}
                      {alterations.map(alt => (
                        <button
                          key={alt}
                          type="button"
                          onClick={() => handleFindingChange(finding, alt)}
                          className={`px-3 py-1 text-sm rounded-full transition-colors ${
                            selectedFindings[finding] === alt
                              ? 'bg-red-500 text-white font-semibold'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
