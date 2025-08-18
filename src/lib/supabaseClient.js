// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Obtém as variáveis de ambiente.
// Você precisará criar um arquivo .env.local na raiz do projeto com esses valores.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cria e exporta o cliente Supabase.
// Este objeto será usado para todas as interações com o banco de dados e autenticação.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
