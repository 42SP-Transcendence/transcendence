import type { Metadata } from 'next';

import { AuthCard } from '../../components/auth-card';
import { SignUpForm } from './sign-up-form';

export const metadata: Metadata = { title: 'Criar conta · Observatório' };

/**
 * Sign-up page at /cadastro.
 */
export default function SignUpPage() {
  return (
    <AuthCard
      title="Criar conta"
      description="Cadastre-se para acompanhar os ônibus de São Paulo com o Observatório."
      footerText="Já tem conta?"
      footerLinkLabel="Entrar"
      footerHref="/entrar"
    >
      <SignUpForm />
    </AuthCard>
  );
}
