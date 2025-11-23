import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config'

// Debug para verificar variables cargadas
console.log("🔍 DEBUG SUPABASE:");
console.log("SUPABASE_URL =", SUPABASE_URL);
console.log("SUPABASE_ANON_KEY =", SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(0, 10) + "..." : "NO DEFINIDA");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL o clave anónima no configurada")
}

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)
