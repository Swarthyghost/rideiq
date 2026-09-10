/**
 * Split out from session.ts on purpose: this file must stay free of any
 * import chain that pulls in firebase-admin. proxy.ts (the Edge-runtime
 * middleware) needs SESSION_COOKIE_NAME, and Edge can't load firebase-admin
 * (Node-only) — importing it from session.ts dragged the whole Admin SDK
 * into the middleware bundle and crashed every request at runtime.
 */
export const SESSION_COOKIE_NAME = "__session";
export const SESSION_EXPIRY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days
