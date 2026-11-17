import { type AuthUser, authUserSchema, type SignIn, type SignUp } from '@transcendence/schemas';

export interface FieldIssue {
  field: string;
  code: string;
}

export class AuthRequestError extends Error {
  /**
   * Carries the HTTP status, the API error code and any per-field issues of a failed request.
   */
  constructor(
    readonly status: number,
    readonly code: string,
    readonly issues: FieldIssue[] = [],
  ) {
    super(code);
    this.name = 'AuthRequestError';
  }
}

/**
 * Keeps only the issues that have a string field and a string code.
 */
function parseIssues(value: unknown): FieldIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (issue): issue is FieldIssue =>
      typeof issue === 'object' &&
      issue !== null &&
      typeof issue.field === 'string' &&
      typeof issue.code === 'string',
  );
}

/**
 * Sends a JSON body to an auth endpoint and returns the authenticated user, or throws an AuthRequestError.
 */
async function postAuth(path: string, body: SignUp | SignIn): Promise<AuthUser> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthRequestError(0, 'network_error');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (response.ok) {
    const user = authUserSchema.safeParse(payload);
    if (!user.success) {
      throw new AuthRequestError(response.status, 'unexpected_error');
    }
    return user.data;
  }
  const data = typeof payload === 'object' && payload !== null ? payload : {};
  const code =
    'message' in data && typeof data.message === 'string' ? data.message : 'unexpected_error';
  const issues = 'issues' in data ? parseIssues(data.issues) : [];
  throw new AuthRequestError(response.status, code, issues);
}

/**
 * Creates an account through POST /api/auth/signup.
 */
export function signUp(input: SignUp): Promise<AuthUser> {
  return postAuth('/api/auth/signup', input);
}

/**
 * Opens a session through POST /api/auth/login; the API sets the httpOnly session cookie.
 */
export function signIn(input: SignIn): Promise<AuthUser> {
  return postAuth('/api/auth/login', input);
}

/**
 * Returns the signed-in user from GET /api/auth/me, or null when there is no valid session or the API cannot be reached.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (!response.ok) {
      return null;
    }
    const user = authUserSchema.safeParse(await response.json());
    return user.success ? user.data : null;
  } catch {
    return null;
  }
}

/**
 * Ends the session through POST /api/auth/logout, or throws an AuthRequestError when the API refuses or cannot be reached.
 */
export async function signOut(): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    throw new AuthRequestError(0, 'network_error');
  }
  if (!response.ok) {
    throw new AuthRequestError(response.status, 'unexpected_error');
  }
}
