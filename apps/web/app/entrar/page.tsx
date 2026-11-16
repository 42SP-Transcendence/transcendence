import type { Metadata } from 'next';

import { AuthCard } from '../../components/auth-card';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Entrar · Observatório' };

/**
 * Sign-in page at /entrar.
 */
export default function SignInPage() {
  return (
    <AuthCard
      title="Entrar"
      description="Acesse sua conta do Observatório."
      footerText="Ainda não tem conta?"
      footerLinkLabel="Criar conta"
      footerHref="/cadastro"
    >
      <SignInForm />
    </AuthCard>
  );
}
