// scripts/bootstrap-admin-password.mjs
/**
 * Bootstrap LOCAL/úNICO de senha do Admin (server-side).
 * Roda manualmente NO SEU COMPUTADOR — NÃO é endpoint HTTP, não expõe service_role.
 * Uso: node scripts/bootstrap-admin-password.mjs
 */
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const SUPABASE_URL = 'https://bdpocxppyoavqbpcmfdb.supabase.co';
const ADMIN_UUID = '0bb2451e-9513-4a15-88b3-f7c2d1367bf5';
const ADMIN_EMAIL = 'ricardofelipedeoliveirasantos1@gmail.com';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr, // stdout usado só para prints finais; stderr para prompts
});

const ask = (q) =>
  new Promise((resolve) => {
    rl.question(q, (a) => resolve(a.trim()));
  });

const hideInput = (q) =>
  new Promise((resolve) => {
    process.stderr.write(q);
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    let line = '';
    stdin.on('data', (c) => {
      const s = c.toString('utf8');
      if (s === '\n' || s === '\r' || s === '\u0004') {
        process.stderr.write('\n');
        try { stdin.setRawMode?.(false); } catch (_) {}
        stdin.pause();
        resolve(line);
      } else if (Buffer.from(c).toString('hex') === '08' || s === '\b') {
        line = line.slice(0, -1);
      } else {
        line += s;
      }
    });
  });

const fail = (m) => { process.stderr.write('[bootstrap] ERRO: ' + m + '\n'); process.exit(1); };
const done = (m) => { process.stderr.write('[bootstrap] ' + m + '\n'); process.exit(0); };

(async () => {
  const SERVICE_ROLE = await hideInput('Service Role (oculto): ');
  const NEW_PASSWORD = await hideInput('Nova senha (6 dígitos, oculto): ');

  if (!SERVICE_ROLE) fail('Service role é obrigatório.');
  if (!/^\d{6}$/.test(NEW_PASSWORD)) fail('Senha deve ter exatamente 6 dígitos.');

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE); // service_role SOMENTE na memória deste processo

  try {
    // 7. validar usuário Auth
    const { data: u, error: ue } = await supabase.auth.admin.getUserById(ADMIN_UUID);
    if (ue) fail('Não foi possível buscar usuário Auth.');
    if (!u?.user) fail('UUID não existe em auth.users.');
    if (u.user.id !== ADMIN_UUID) fail('UUID não corresponde ao esperado.');
    if (u.user.email !== ADMIN_EMAIL) fail('E-mail do Auth não corresponde ao esperado (' + (u.user.email || '') + ').');

    // 7. validar profile
    const { data: p, error: pe } = await supabase
      .from('profiles').select('id, role').eq('id', ADMIN_UUID).single();
    if (pe) fail('Não foi possível buscar profile: ' + JSON.stringify(pe));
    if (!p) fail('Profile não encontrado para o UUID.');
    if (p.role !== 'admin') fail('Profile.role !== admin (' + p.role + '). Nada será alterado.');

    // 8. alterar SOMENTE a senha
    const { error: upErr } = await supabase.auth.admin.updateUserById(ADMIN_UUID, { password: NEW_PASSWORD });
    if (upErr) fail('Falha ao atualizar senha: ' + JSON.stringify(upErr));

    done('Senha do Admin atualizada com sucesso.');
  } catch (e) {
    fail('Erro inesperado: ' + (e?.message || String(e)));
  }
})();
