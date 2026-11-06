// Endereço do Supabase e chave anon. Ambos são públicos por design (ADR 0001):
// a chave anon só consegue executar as funções publicadas. NUNCA coloque aqui a chave
// service_role nem a senha do banco.

// Projeto Supabase remoto (preencha com Project Settings > API do projeto da equipe).
const REMOTO = {
  url: 'https://xybbbumhbhuwhjthyqna.supabase.co',
  // anonKey: 'COLE-AQUI-A-CHAVE-ANON-DO-PROJETO-REMOTO',
  anonKey: 'sb_publishable_jnibuHZHps9AlfO-Ob9ABQ_BBjIKP-N',
};

// Supabase local (`npx supabase start`). A chave anon local é a padrão do Supabase CLI;
// confira com `npx supabase status` se tiver mudado as portas.
const LOCAL = {
  url: 'http://127.0.0.1:54321',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
};

const ehLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

// `?supabase=http://127.0.0.1:54821` permite apontar para um Supabase local em outra porta.
const urlForcada = new URLSearchParams(location.search).get('supabase');

export const config = ehLocal
  ? { ...LOCAL, url: urlForcada || LOCAL.url }
  : REMOTO;
