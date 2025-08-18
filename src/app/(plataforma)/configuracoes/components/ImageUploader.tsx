'use client';

import { useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { UploadCloud, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  bucket: string;
  url: string | null;
  profileField: 'avatar_url' | 'signature_url' | 'clinic_logo_url';
  onUploadSuccess: (url: string) => void;
  fallbackName?: string;
}

export default function ImageUploader({ bucket, url, profileField, onUploadSuccess, fallbackName }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClientComponentClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarUrl = (url && url.trim() !== '')
    ? url
    : `https://ui-avatars.com/api/?name=${fallbackName || '?'}&background=ffffff&color=14b8a6&size=128`;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Selecione uma imagem para enviar.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado.");

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
      
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ [profileField]: publicUrl, updated_at: new Date() })
        .eq('id', user.id);
      
      if (dbError) throw dbError;

      onUploadSuccess(publicUrl);
      toast.success("Imagem guardada com sucesso!");

    } catch (error: any) {
      toast.error('Erro no envio da imagem:', { description: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative group" onClick={() => fileInputRef.current?.click()}>
          <img src={avatarUrl} alt="Preview" className="h-24 w-24 rounded-full object-cover border-4 border-light cursor-pointer" />
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <UploadCloud size={28} className="text-white" />
          </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        id={`upload-button-${bucket}`}
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />
      {uploading && <Loader2 className="h-5 w-5 animate-spin text-light" />}
    </div>
  );
}
