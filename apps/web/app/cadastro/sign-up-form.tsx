'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type SignUp, type SignUpInput, signUpSchema } from '@transcendence/schemas';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { FormAlert } from '../../components/form-alert';
import { SubmitButton } from '../../components/submit-button';
import { TextField } from '../../components/text-field';
import { applyServerError } from '../../lib/apply-server-error';
import { signIn, signUp } from '../../lib/auth-client';
import { errorMessage, passwordHint } from '../../lib/auth-messages';

const fields = ['email', 'displayName', 'password'] as const;

/**
 * Sign-up form validated with the shared schema; on success it signs the person in and goes home.
 */
export function SignUpForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput, unknown, SignUp>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', displayName: '', password: '' },
  });

  /**
   * Creates the account, opens the session and redirects, or maps the API error onto the form.
   */
  async function onSubmit(values: SignUp) {
    try {
      await signUp(values);
      await signIn({ email: values.email, password: values.password });
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
        label="Nome de exibição"
        autoComplete="nickname"
        hint="É assim que outras pessoas vão ver você no Observatório."
        error={errorMessage(errors.displayName?.message)}
        {...register('displayName')}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="new-password"
        hint={passwordHint}
        error={errorMessage(errors.password?.message)}
        {...register('password')}
      />
      <SubmitButton pending={isSubmitting} label="Criar conta" pendingLabel="Criando conta…" />
    </form>
  );
}
