import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setProviderToken, ensureApiToken, clearApiAuth } from "@/services/apiAuth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: (next?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FORCE_ACCOUNT_PICKER_KEY = "ftc_force_account_picker";

/** Remove sessão Supabase, tokens e qualquer cache local do usuário. */
const clearBrowserAuthState = () => {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key === FORCE_ACCOUNT_PICKER_KEY) continue;
      if (
        key.startsWith("sb-") ||
        key.startsWith("supabase.") ||
        key.startsWith("ftc_") ||
        key.startsWith("lovable")
      ) {
        localStorage.removeItem(key);
      }
    }
    sessionStorage.clear();
  } catch {
    // storage indisponível
  }
  // Cookies não-HttpOnly do domínio atual
  try {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (!name) continue;
      const parts = window.location.hostname.split(".");
      const domains = ["", window.location.hostname];
      for (let i = 0; i < parts.length - 1; i++) domains.push("." + parts.slice(i).join("."));
      for (const d of domains) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
      }
    }
  } catch {
    // ignore
  }
};


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.provider_token) {
          setProviderToken(session.provider_token);
          // Exchange the Google token for the external API token
          setTimeout(() => { void ensureApiToken(true); }, 0);
        } else if (event === "SIGNED_OUT") {
          clearApiAuth();
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.provider_token) setProviderToken(session.provider_token);
      if (session) {
        void ensureApiToken().catch(() => {
          // Protected API calls will send the user through Google again when required.
        });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async () => {
    return await signInWithGoogle();
  };

  const signIn = async () => {
    return await signInWithGoogle();
  };

  const signInWithGoogle = async (next?: string) => {
    const redirectTo =
      next && next.startsWith("/") && !next.startsWith("//")
        ? `${window.location.origin}/auth?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/`;

    // Drop any stale API/provider token so the callback always exchanges a fresh one.
    clearApiAuth();

    // Depois de um logout explícito, forçamos a tela de escolha de conta do Google.
    const forceSelect = localStorage.getItem(FORCE_ACCOUNT_PICKER_KEY) === "1";
    localStorage.removeItem(FORCE_ACCOUNT_PICKER_KEY);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: forceSelect
          ? { access_type: 'offline', prompt: 'select_account consent' }
          : { access_type: 'offline' },
      },
    });

    return { error };
  };

  const signOut = async () => {
    clearApiAuth();
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      // segue com a limpeza local mesmo se a chamada remota falhar
    }
    clearBrowserAuthState();
    localStorage.setItem(FORCE_ACCOUNT_PICKER_KEY, "1");
    // Recarrega para descartar qualquer estado em memória.
    window.location.replace("/auth");
  };


  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
