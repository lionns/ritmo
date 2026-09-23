/** Only public device metadata crosses the front boundary. */
export interface Device { id: string; label: string; createdAt: string; lastUsedAt: string | null }
export interface DevicesResponse { credentials: Device[] }
export interface PasskeyReply {
  id: string; clientDataJSON: string; authenticatorData: string;
  signature?: string; userHandle?: string | null; label?: string;
}
export interface AuthError { error: string }
export interface AuthSuccess { ok: true }
