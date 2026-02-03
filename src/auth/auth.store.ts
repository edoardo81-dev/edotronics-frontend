const TOKEN_KEY = "auth_token";
const ROLE_KEY = "auth_role";

// ✅ guest gate (per bloccare /products se non hai cliccato il bottone guest)
const GUEST_KEY = "guest_access";

// ✅ evento per forzare re-render dell'app quando cambia auth
const AUTH_EVENT = "auth_changed";
function emitAuthChanged() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

/**
 * ✅ NOTA:
 * - sessionStorage = dura finché la tab/browser resta aperta
 * - chiudi e riapri -> vuoto -> login richiesto
 */

export function setAuth(token: string, role: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(ROLE_KEY, role);

  // se fai login, non sei più guest
  sessionStorage.removeItem(GUEST_KEY);

  emitAuthChanged();
}

export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  emitAuthChanged();
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  return sessionStorage.getItem(ROLE_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/* =========================
   Guest access (catalogo senza credenziali)
   ========================= */

export function setGuestAccess() {
  sessionStorage.setItem(GUEST_KEY, "1");
  emitAuthChanged();
}

export function clearGuestAccess() {
  sessionStorage.removeItem(GUEST_KEY);
  emitAuthChanged();
}

export function hasGuestAccess(): boolean {
  return sessionStorage.getItem(GUEST_KEY) === "1";
}

// Decodifica “soft” del JWT (solo per UI)
export function getUsernameFromToken(): string | null {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload));
    return json?.sub ?? null;
  } catch {
    return null;
  }
}
