## Objetivo

Trocar o servidor externo de `https://ifms.pro.br:6005` para `https://frontendteamscup.com.br/api`, mantendo os mesmos caminhos (`/usuarios`, `/times`, `/time/...`, `/baixar-pastas-pares`, `/uploads/...`, `/obter-gif`) agora sob `/api`. Como o novo domínio tem certificado SSL válido, a tela de autorização manual deixa de ser necessária.

## O que muda

**1. URL base no frontend**
- `src/services/api.ts`: `API_BASE_URL` passa a ser `https://frontendteamscup.com.br/api` (afeta também a montagem de URLs de `/uploads/{code_pasta}/`).

**2. URL base nas funções de backend (proxies)**
- `supabase/functions/api-proxy/index.ts`
- `supabase/functions/api-proxy-dinamicas/index.ts`
- `supabase/functions/api-proxy-files/index.ts`
- `supabase/functions/api-proxy-gif/index.ts`

Todas passam a apontar para o novo host com prefixo `/api`. As listas de caminhos permitidos (SSRF) continuam iguais, pois o prefixo `/api` fica na base. As quatro funções são reimplantadas.

**3. Remoção da autorização de servidor**
- Excluir `src/pages/ServerAuthorization.tsx` e `src/components/ServerAuthGuard.tsx`.
- Em `src/App.tsx`: remover a rota `/server-auth` e o wrapper `ServerAuthGuard`, deixando as rotas direto sob o `BrowserRouter`.
- Resultado: o app carrega imediatamente, sem a tela de verificação e sem o bloqueio de carregamento.

## Detalhes técnicos

- Fica uma única constante de base por arquivo; nenhuma chamada passa a ter `/api` duplicado no path.
- O roteamento continua pelas edge functions com JWT (`makeAuthenticatedRequest`), conforme a regra do projeto — nenhuma chamada direta ao domínio externo a partir do navegador é reintroduzida.
- Verificação após a mudança: carregar `/` e `/teams` no preview e conferir console/rede sem erros, além de um teste direto de uma edge function proxy.
