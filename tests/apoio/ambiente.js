// Descobre URL e chaves do Supabase local.
// Ordem: variáveis de ambiente (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
// e, na falta delas, `npx supabase status -o env` (lê as portas do config.toml desta cópia).
import { execSync } from 'node:child_process';

let cache;

function lerStatus() {
  const saida = execSync('npx supabase status -o env', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const vars = {};
  for (const linha of saida.split(/\r?\n/)) {
    const m = linha.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m) vars[m[1]] = m[2];
  }
  return vars;
}

export function ambiente() {
  if (cache) return cache;
  let { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: servico } = process.env;
  if (!url || !anon || !servico) {
    let status;
    try {
      status = lerStatus();
    } catch (e) {
      throw new Error(
        'Supabase local não encontrado. Rode `npx supabase start` antes dos testes ' +
          '(ou defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY).\n' + e.message,
      );
    }
    url ??= status.API_URL;
    anon ??= status.ANON_KEY;
    servico ??= status.SERVICE_ROLE_KEY;
  }
  cache = { url, anon, servico };
  return cache;
}
