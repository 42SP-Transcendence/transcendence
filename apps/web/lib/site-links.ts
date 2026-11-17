export interface SiteLink {
  href: string;
  label: string;
}

export const MAIN_LINKS: SiteLink[] = [{ href: '/', label: 'Início' }];

export const LEGAL_LINKS: SiteLink[] = [
  { href: '/privacidade', label: 'Política de Privacidade' },
  { href: '/termos', label: 'Termos de Uso' },
];
