import { expect, header, test } from './fixtures';

for (const path of ['/', '/entrar', '/cadastro']) {
  test(`${path} não tem rolagem horizontal`, async ({ page }) => {
    await page.goto(path);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test('o primeiro Tab chega no link para o conteúdo, que leva ao main', async ({ page }) => {
  await page.goto('/entrar');

  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('o rodapé leva às páginas legais', async ({ page }) => {
  await page.goto('/');

  const footer = page.getByRole('navigation', { name: 'Rodapé' });
  await expect(footer.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute(
    'href',
    '/privacidade',
  );
  await expect(footer.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute(
    'href',
    '/termos',
  );
});

test.describe('em 360 px', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 400, 'menu só existe em telas pequenas');

  test('o menu abre pelo teclado e o Escape fecha e devolve o foco', async ({ page }) => {
    await page.goto('/');
    const toggle = header(page).getByRole('button', { name: 'Menu' });
    await expect(header(page).getByRole('navigation', { name: 'Principal' })).toBeHidden();

    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(header(page).getByRole('link', { name: 'Início' })).toBeVisible();
    await expect(header(page).getByRole('link', { name: 'Criar conta' })).toBeVisible();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    const closed = header(page).getByRole('button', { name: 'Menu' });
    await expect(closed).toHaveAttribute('aria-expanded', 'false');
    await expect(closed).toBeFocused();
  });
});
