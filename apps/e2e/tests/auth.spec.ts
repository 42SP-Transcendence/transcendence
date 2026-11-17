import { createAccount, expect, header, newAccount, openMenuIfCollapsed, test } from './fixtures';

test.describe('cadastro, login e logout', () => {
  test('cadastro abre a sessão, sobrevive ao recarregar e o logout encerra', async ({ page }) => {
    const account = newAccount('Ana Teste');
    await page.goto('/cadastro');

    await page.getByLabel('E-mail').fill(account.email);
    await page.getByLabel('Nome de exibição').fill(account.displayName);
    await page.getByLabel('Senha').fill(account.password);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL('/');
    await openMenuIfCollapsed(page);
    await expect(header(page)).toContainText(account.displayName);

    await page.reload();
    await openMenuIfCollapsed(page);
    await expect(header(page)).toContainText(account.displayName);

    await header(page).getByRole('button', { name: 'Sair' }).click();
    await expect(header(page)).not.toContainText(account.displayName);
    await openMenuIfCollapsed(page);
    await expect(header(page).getByRole('link', { name: 'Entrar' })).toBeVisible();
    expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  });

  test('login com uma conta existente leva para o início com o nome no cabeçalho', async ({
    page,
    request,
  }) => {
    const account = newAccount('Bruno Teste');
    await createAccount(request, account);

    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill(account.email.toUpperCase());
    await page.getByLabel('Senha').fill(account.password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/');
    await openMenuIfCollapsed(page);
    await expect(header(page)).toContainText(account.displayName);
  });

  test('a sessão usa um cookie httpOnly, secure e sameSite', async ({ page, request }) => {
    const account = newAccount();
    await createAccount(request, account);

    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill(account.email);
    await page.getByLabel('Senha').fill(account.password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/');

    const session = (await page.context().cookies()).find((cookie) => cookie.name === 'session');
    expect(session).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax' });
    expect(await page.evaluate(() => document.cookie)).not.toContain('session=');
  });

  test('senha errada mostra um erro sem dizer qual campo errou', async ({ page, request }) => {
    const account = newAccount();
    await createAccount(request, account);

    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill(account.email);
    await page.getByLabel('Senha').fill('senha-errada-123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert').first()).toHaveText(
      'E-mail ou senha incorretos. Confira e tente de novo.',
    );
    await expect(page).toHaveURL('/entrar');
  });

  test('e-mail já cadastrado é recusado com uma mensagem clara', async ({ page, request }) => {
    const account = newAccount();
    await createAccount(request, account);

    await page.goto('/cadastro');
    await page.getByLabel('E-mail').fill(account.email);
    await page.getByLabel('Nome de exibição').fill('Outra Pessoa');
    await page.getByLabel('Senha').fill(account.password);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    const email = page.getByLabel('E-mail');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAccessibleDescription(
      'Já existe uma conta com este e-mail. Entre nela ou use outro e-mail.',
    );
    await expect(email).toBeFocused();
    await expect(page).toHaveURL('/cadastro');
  });

  test('o front valida com as mesmas regras sem chamar a api', async ({ page }) => {
    const signupCalls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/auth/signup')) {
        signupCalls.push(request.url());
      }
    });
    await page.goto('/cadastro');

    await page.getByLabel('E-mail').fill('nao-e-email');
    await page.getByLabel('Nome de exibição').fill('A');
    await page.getByLabel('Senha').fill('curta');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    const email = page.getByLabel('E-mail');
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAccessibleDescription(
      'Informe um e-mail válido, como nome@exemplo.com.',
    );
    await expect(page.getByLabel('Senha')).toHaveAccessibleDescription(
      /A senha precisa ter pelo menos 12 caracteres\./,
    );
    expect(signupCalls).toEqual([]);
  });

  test('a api recusa o que o front recusaria', async ({ request }) => {
    const response = await request.post('/api/auth/signup', {
      data: { email: 'nao-e-email', password: 'curta', displayName: 'A' },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({
      message: 'validation_failed',
      issues: [
        { field: 'email', code: 'email_invalid' },
        { field: 'password', code: 'password_too_short' },
        { field: 'displayName', code: 'display_name_too_short' },
      ],
    });
  });

  test('duas pessoas logadas ao mesmo tempo não interferem uma na outra', async ({
    browser,
    request,
  }) => {
    const ana = newAccount('Ana Paralela');
    const caio = newAccount('Caio Paralelo');
    await createAccount(request, ana);
    await createAccount(request, caio);

    const sessions = await Promise.all(
      [ana, caio].map(async (account) => {
        const context = await browser.newContext({ ignoreHTTPSErrors: true });
        const response = await context.request.post('/api/auth/login', {
          data: { email: account.email, password: account.password },
        });
        expect(response.status()).toBe(200);
        return { account, context };
      }),
    );

    for (const { account, context } of sessions) {
      const me = await context.request.get('/api/auth/me');
      expect((await me.json()).displayName).toBe(account.displayName);
    }

    await sessions[0]?.context.request.post('/api/auth/logout');
    expect((await sessions[0]?.context.request.get('/api/auth/me'))?.status()).toBe(401);
    expect((await sessions[1]?.context.request.get('/api/auth/me'))?.status()).toBe(200);

    await Promise.all(sessions.map(({ context }) => context.close()));
  });
});
