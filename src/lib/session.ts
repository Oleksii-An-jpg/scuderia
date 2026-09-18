// Shared between the Edge middleware and the Node-side auth helpers, so it must
// stay free of `server-only` and of any firebase-admin import.

export const SESSION_COOKIE = "session";

export const ROLES = ["admin", "editor", "viewer", "guest"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
    return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
