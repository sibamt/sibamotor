import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ADMIN_USERNAME, type LocalUser, verifyLocalUser } from "./local-users";

const SESSION_KEY = "sibamotor-session";

type SessionCtx = {
  user: LocalUser | null;
  ready: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<LocalUser | null>;
  logout: () => void;
};

const Ctx = createContext<SessionCtx | null>(null);

// The session itself (who is currently signed in on THIS browser) is fine to
// keep in localStorage — it's just a "remember me" convenience, not shared
// data. The account list it's checked against now lives in Postgres.
function readSession(): LocalUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalUser;
    if (!parsed?.username || !parsed.displayName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function LocalSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(readSession());
    setReady(true);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const next = await verifyLocalUser({ data: { username, password } });
    if (!next) return null;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const isAdmin = user?.username === ADMIN_USERNAME;
  const value = useMemo(
    () => ({ user, ready, isAdmin, login, logout }),
    [user, ready, isAdmin, login, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocalSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocalSession outside provider");
  return ctx;
}
