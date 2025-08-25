'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { X, Loader2, Save } from 'lucide-react';
import MedicalHistoryManager from './MedicalHistoryManager';

// Tipos para os dados
type Patient = { [key: string]: any };
type Field = 'medical_history' | 'allergies' | 'medications';

interface EditPatientDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  fieldToEdit: Field | null;
  onSaveSuccess: (updatedPatient: Patient) => void;
}

const fieldLabels: Record<Field, string> = {
  medical_history: 'Histórico Médico (Doenças)',
  allergies: 'Alergias',
  medications: 'Medicação de Uso Contínuo',
};

export default function EditPatientDataModal({ isOpen, onClose, patient, fieldToEdit, onSaveSuccess }: EditPatientDataModalProps) {
  const [currentValue, setCurrentValue] = useState<any>('');
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (patient && fieldToEdit) {
      setCurrentValue(patient[fieldToEdit] || (fieldToEdit === 'medical_history' ? [] : ''));
    }
  }, [isOpen, patient, fieldToEdit]);

  const handleSave = async () => {
    if (!patient || !fieldToEdit) return;
    setLoading(true);
    try {
      const { data: updatedPatient, error } = await supabase
        .from('patients')
        .update({ [fieldToEdit]: currentValue })
        .eq('id', patient.id)
        .select()
        .single();
      
      if (error) throw error;

      toast.success("Informação atualizada com sucesso!");
      onSaveSuccess(updatedPatient);
      onClose();
    } catch (error: any) {
      toast.error("Não foi possível guardar a alteração.", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !fieldToEdit) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-foreground">Editar {fieldLabels[fieldToEdit]}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X className="h-5 w-5 text-muted" /></button>
        </div>
        
        <div className="min-h-[200px]">
          {fieldToEdit === 'medical_history' ? (
            <MedicalHistoryManager 
              history={currentValue} 
              onHistoryChange={setCurrentValue} 
              isFinalized={false} 
            />
          ) : (
            <textarea 
              value={currentValue} 
              onChange={(e) => setCurrentValue(e.target.value)}
              className="w-full h-full min-h-[200px] rounded-md border-border bg-gray-50 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-light text-sm"
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md border border-border hover:bg-gray-100">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="inline-flex items-center justify-center rounded-md bg-light px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {loading ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
