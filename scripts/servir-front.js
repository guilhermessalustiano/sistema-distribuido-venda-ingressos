// Servidor estático mínimo para testar o front localmente (sem dependências).
// Uso: npm run front  [-- --porta 3000]
// Em produção o diretório src/ é servido pela Vercel; este script é só para desenvolvimento.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('../src/', import.meta.url)));
const i = process.argv.indexOf('--porta');
const porta = Number(i > -1 ? process.argv[i + 1] : process.env.PORT || 3000);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arquivo = normalize(join(raiz, caminho.endsWith('/') ? caminho + 'index.html' : caminho));
  if (!arquivo.startsWith(raiz)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const corpo = await readFile(arquivo);
    res.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' });
    res.end(corpo);
  } catch {
    res.writeHead(404).end('não encontrado');
  }
}).listen(porta, '127.0.0.1', () => {
  console.log(`Front em http://127.0.0.1:${porta}`);
});
