'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type SignIn, type SignInInput, signInSchema } from '@transcendence/schemas';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { FormAlert } from '../../components/form-alert';
import { SubmitButton } from '../../components/submit-button';
import { TextField } from '../../components/text-field';
import { applyServerError } from '../../lib/apply-server-error';
import { signIn } from '../../lib/auth-client';
import { errorMessage } from '../../lib/auth-messages';

const fields = ['email', 'password'] as const;

/**
 * Sign-in form validated with the shared schema; on success it goes home.
 */
export function SignInForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput, unknown, SignIn>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  /**
   * Opens the session and redirects, or maps the API error onto the form.
   */
  async function onSubmit(values: SignIn) {
    try {
      await signIn(values);
      router.replace('/');
    } catch (error) {
      applyServerError(error, fields, setError);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <FormAlert message={errorMessage(errors.root?.server?.message)} />
      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        error={errorMessage(errors.email?.message)}
        {...register('email')}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={errorMessage(errors.password?.message)}
        {...register('password')}
      />
      <SubmitButton pending={isSubmitting} label="Entrar" pendingLabel="Entrando…" />
    </form>
  );
}
