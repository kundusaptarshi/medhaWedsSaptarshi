import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';

const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : {};

/**
 * Explicit public Firebase Web SDK configuration bundled directly in the frontend.
 * Supports optional VITE_FIREBASE_* environment overrides (e.g. on Cloudflare Pages)
 * and strips AI Studio OAuth fields so Firestore writes never depend on AI Studio session auth.
 */
export const firebaseWebConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    firebaseAppletConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
};

export const FIRESTORE_DATABASE_ID: string =
  env.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseWebConfig);

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      { experimentalAutoDetectLongPolling: true },
      FIRESTORE_DATABASE_ID
    );
  } catch {
    return getFirestore(app, FIRESTORE_DATABASE_ID);
  }
}

export const db: Firestore = createFirestoreInstance();

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    const code = extractFirebaseErrorCode(error);
    if (
      error instanceof Error &&
      (error.message.includes('the client is offline') || code === 'unavailable')
    ) {
      console.error(
        `[Firebase Connection Check] Firestore appears offline (code=${code ?? 'offline'}). Check your Firebase configuration and network.`,
        {
          code: code ?? 'offline',
          projectId: firebaseWebConfig.projectId,
          databaseId: FIRESTORE_DATABASE_ID,
          error,
        }
      );
    }
  }
}

if (typeof window !== 'undefined') {
  void testConnection();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  code?: string | null;
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function extractFirebaseErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const rawCode = (error as { code?: unknown }).code;
    if (typeof rawCode === 'string' && rawCode.trim().length > 0) {
      return rawCode.trim();
    }
  }
  return null;
}

export function formatFirestoreUserMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as Partial<FirestoreErrorInfo>;
      if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
        if (parsed.code) {
          return `${fallbackMessage} (${parsed.code})`;
        }
        return fallbackMessage;
      }
    } catch {
      // Plain non-JSON error
    }
    const directCode = extractFirebaseErrorCode(error);
    if (directCode) {
      return `${fallbackMessage} (${directCode})`;
    }
    if (error.message) {
      return error.message;
    }
  }
  return fallbackMessage;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const firebaseCode = extractFirebaseErrorCode(error);
  const rawMessage = error instanceof Error ? error.message : String(error);

  const errInfo: FirestoreErrorInfo = {
    code: firebaseCode,
    error: rawMessage,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };

  console.error(
    `[Firebase Firestore Error] code=${firebaseCode ?? 'unknown'} | operation=${operationType} | path=${path ?? 'unknown'} | projectId=${firebaseWebConfig.projectId ?? 'unknown'} | databaseId=${FIRESTORE_DATABASE_ID}`,
    {
      code: firebaseCode ?? 'unknown',
      message: rawMessage,
      operationType,
      path,
      projectId: firebaseWebConfig.projectId,
      databaseId: FIRESTORE_DATABASE_ID,
      rawError: error,
    }
  );
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
