import { randomUUID } from 'node:crypto';

import { type APIRequestContext, expect, type Page, test as base } from '@playwright/test';

export interface Account {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Builds a fresh account so tests never collide, even when they run in parallel or twice on the same database.
 */
export function newAccount(displayName = 'Pessoa de Teste'): Account {
  return {
    email: `e2e-${randomUUID()}@exemplo.com`,
    password: `senha-e2e-${randomUUID()}`,
    displayName,
  };
}

/**
 * Creates an account straight through the API, for tests whose subject is not the sign-up screen.
 */
export async function createAccount(request: APIRequestContext, account: Account): Promise<void> {
  const response = await request.post('/api/auth/signup', { data: account });
  expect(response.status()).toBe(201);
}

const PENDING_PAGES = ['/privacidade', '/termos'];

/**
 * Tells whether a console error is expected: a 4xx from the auth API, such as GET /api/auth/me without a session, or the footer prefetching the legal pages that #19 has not published yet.
 */
function isExpectedFailure(text: string, url: string): boolean {
  if (!text.startsWith('Failed to load resource')) {
    return false;
  }
  const { pathname } = new URL(url);
  if (pathname.startsWith('/api/auth/')) {
    return /status of 4\d\d/.test(text);
  }
  return PENDING_PAGES.includes(pathname) && text.includes('status of 404');
}

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (
          message.type() === 'error' &&
          !isExpectedFailure(message.text(), message.location().url)
        ) {
          errors.push(message.text());
        }
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Returns the site header, where the session area lives.
 */
export function header(page: Page) {
  return page.getByRole('banner');
}

/**
 * Opens the small-screen menu when the toggle is visible, so session controls can be reached at any width.
 */
export async function openMenuIfCollapsed(page: Page): Promise<void> {
  const toggle = header(page).getByRole('button', { name: 'Menu' });
  if (await toggle.isVisible()) {
    await toggle.click();
  }
}

export { expect };
