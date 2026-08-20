// Authentication against the external Frontend Teams Cup API.
// Flow: Google sign-in -> POST /login (Bearer provider token + X-Auth-Provider: google)
// -> receive the API token -> send it on every subsequent request.
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const API_TOKEN_KEY = 'ftc_api_token';
const PROVIDER_TOKEN_KEY = 'ftc_provider_token';
const PROVIDER_TOKEN_AT_KEY = 'ftc_provider_token_at';

export const setProviderToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(PROVIDER_TOKEN_KEY, token);
    localStorage.setItem(PROVIDER_TOKEN_AT_KEY, String(Date.now()));
  }
};

export const getProviderToken = (): string | null => {
  // Não expiramos o token do Google por tempo: só o descartamos quando a API
  // realmente o rejeita. Assim o usuário continua logado no mesmo dispositivo.
  return localStorage.getItem(PROVIDER_TOKEN_KEY);
};

export const getApiToken = (): string | null => localStorage.getItem(API_TOKEN_KEY);

export class ApiReauthenticationRequiredError extends Error {
  constructor() {
    super('Sua autorização com o Google expirou. Entre novamente para continuar.');
    this.name = 'ApiReauthenticationRequiredError';
  }
}

export const setApiToken = (token: string | null) => {
  if (token) localStorage.setItem(API_TOKEN_KEY, token);
  else localStorage.removeItem(API_TOKEN_KEY);
};

export const clearProviderToken = () => {
  localStorage.removeItem(PROVIDER_TOKEN_KEY);
  localStorage.removeItem(PROVIDER_TOKEN_AT_KEY);
};

export const clearApiAuth = () => {
  localStorage.removeItem(API_TOKEN_KEY);
  localStorage.removeItem(PROVIDER_TOKEN_KEY);
  localStorage.removeItem(PROVIDER_TOKEN_AT_KEY);
};

const extractToken = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, any>;
  return (
    obj.token ||
    obj.access_token ||
    obj.jwt ||
    obj.data?.token ||
    obj.data?.access_token ||
    null
  );
};

/**
 * Performs POST /login on the external API using the Google provider token.
 * Returns the API token issued by the external system.
 */
export const loginExternalApi = async (providerTokenArg?: string | null): Promise<string> => {
  const providerToken = providerTokenArg ?? getProviderToken();
  if (!providerToken) {
    throw new Error('Token do Google indisponível. Faça login novamente.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const url = `${SUPABASE_URL}/functions/v1/api-proxy?path=${encodeURIComponent('/login')}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'X-Provider-Token': providerToken,
      'X-Auth-Provider': 'google',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const text = await response.text();
    // Provider token rejected/expired: drop it so we stop retrying with a dead token.
    if (response.status === 401) clearProviderToken();
    throw new Error(`Falha no login da API (${response.status}): ${text}`);
  }

  const data = await response.json().catch(() => null);
  const token = extractToken(data);
  if (!token) throw new Error('A API não retornou um token de acesso.');

  setApiToken(token);
  return token;
};

let inFlightLogin: Promise<string | null> | null = null;

/** Returns a valid API token, logging in when needed. */
export const ensureApiToken = async (forceRefresh = false): Promise<string | null> => {
  if (!forceRefresh) {
    const existing = getApiToken();
    if (existing) return existing;
  }
  if (!getProviderToken()) throw new ApiReauthenticationRequiredError();
  if (inFlightLogin) return inFlightLogin;

  inFlightLogin = (async () => {
    try {
      return await loginExternalApi();
    } catch (error) {
      console.error('Erro no login da API externa:', error);
      throw error;
    } finally {
      inFlightLogin = null;
    }
  })();

  return inFlightLogin;
};
