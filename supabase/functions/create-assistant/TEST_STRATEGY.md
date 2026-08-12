# Estratégia de Testes — Edge Function `create-assistant`

## Princípio

Os testes **NUNCA** tocam no banco de produção. A função roda em Deno
(imports `https://deno.land/...` e `https://esm.sh/...`), portanto usamos
mocks vazados para a camada Supabase e Deno. Aplicam-se cenários
comportamentais contra os requisitos.

## Como rodar (ambiente Deno, fora do banco de produção)

```bash
# Exemplo com Supabase CLI (local) usando mock/stub de storage
supabase functions serve create-assistant
# or: deno test --allow-net tests_deno.ts  (com stubs de createClient)
```

> Nunca apontar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` de produção
> nos testes. Usar variáveis de ambiente de desenvolvimento local ou mocks.

## Mock da camada Supabase

Em cada teste, infeccionamos `createClient` para devolver um objeto com os
métodos usados pela função:

```ts
const admin = {
  auth: {
    admin: {
      createUser: vi.fn(),
      updateUserById: vi.fn(),
      getUserById: vi.fn(),
      deleteUser: vi.fn(),          // cleanup
    },
  },
  from: (table) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    head: vi.fn(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn(),
  }),
};
```

## Matriz de cenários

| # | Cenário | Entrada | Esperado | Requisito |
|---|---------|---------|----------|-----------|
| 1 | Sem header Authorization | — | `401` | 5 |
| 2 | JWT de usuário visitante | token visitor | `403` | 6 |
| 3 | JWT de assistente | token assistant | `403` | 6 |
| 4 | JWT de admin | token admin | comportamento da action | 6 |
| 5 | Senha 5 dígitos | `12345` | `400` "exactly 6 digits" | 10 |
| 6 | Senha 6 dígitos | `123456` | passa validação | 10 |
| 7 | Senha com letras | `abcdef` | `400` | 10 |
| 8 | 3º assistente (2 já existem) | count=2 | `400` limite | 13 |
| 9 | Email duplicado | jwt admin | `400` erro limpo (createUser falha) | 9 |
| 10 | Nome vazio / só espaços | name="" ou "   " | `400` "Name is required" | 11 |
| 11 | Email formato inválido | `abc@` | `400` "Invalid email format" | 12 |
| 12 | Profile não criado pela trigger | select vazio em 3 retries | `500` + cleanup `deleteUser` | 15,20 |
| 13 | Promoção do profile falha | update retorna erro | `500` + cleanup | 16,20 |
| 14 | Permissões falham | upsert retorna erro | `500` + cleanup | 18,19,21 |
| 15 | Sucesso | tudo ok | `200` {success, user{id,name,email,role}} | 29 |
| 16 | `update_password` para assistant | target role='assistant' | `200` (admin é quem chama) | 23 |
| 17 | `update_password` apontando para admin | target role='admin' | `400` "not an assistant" | 23 |
| 18 | `update_password` target inexistente | getUserById falha | `400` "not found" | 23 |
| 19 | Concorrência: afterCount>2 | pós-criação conta 3 | `400` + cleanup do UUID criado | 14 |
| 20 | service_role ausente | sem env var | `500` "Server configuration error" | 7,8 |

## Requisitos cobertos

- Validação de JWT e identidade via token (**1–3**)
- role confirmada via profiles (**4**)
- service_role só via Deno.env.get, nunca ao cliente (**7,8,27,28**)
- senha validada no servidor (**10**)
- limite de 2 no servidor + re-contagem pós-criação (**13,14**)
- trigger confirmada com retry (**15**)
- promoção apenas do UUID recém-criado (**16,17**)
- permissões única linha, upsert idempotente (**18,19**)
- falha parcial com cleanup condicionado ao UUID da requisição (**20,21,22**)
- update_password restrito a assistant (<admin/externo) (**23**)
- resposta sem senha (**29**)

## Garantia: sem banco de produção

Todas as interações são via `createClient` mockado. Nenhum arquivo SQL é
executado. Nenhuma variável real de produção é lida nos testes.