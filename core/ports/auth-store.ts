import type { Credential, Owner } from "../model/entities.ts";

/** Persistent credentials and one-use ceremonies; sessions are never stored. */
export interface AuthStore {
  getOwner(id: string): Promise<Owner | null>;
  createCredential(credential: Credential): Promise<void>;
  getCredential(credentialId: string): Promise<Credential | null>;
  listCredentials(ownerId: string): Promise<Credential[]>;
  deleteCredential(id: string, ownerId: string): Promise<void>;
  advanceCredential(id: string, previousCount: number, count: number, usedAt: string): Promise<boolean>;
  saveChallenge(id: string, ownerId: string, purpose: string, expiresAt: number): Promise<void>;
  consumeChallenge(id: string, ownerId: string, purpose: string, now: number): Promise<boolean>;
  allowAuthAttempt(ownerId: string, window: number): Promise<boolean>;

}
