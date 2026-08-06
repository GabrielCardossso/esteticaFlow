'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, FalhaDaApi } from '@/lib/api';
import { loginSchema, type LoginInput } from '@/schemas';
import { Botao } from '@/components/ui/botao';
import { Campo } from '@/components/ui/campo';

export function FormularioDeLogin() {
  const roteador = useRouter();
  const parametros = useSearchParams();
  const proximo = parametros.get('proximo') ?? '/painel';

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '', lembrar: false },
  });

  const entrar = useMutation({
    mutationFn: async (dados: LoginInput) => {
      const resposta = await api.post('/auth/login', dados);
      return resposta.data as unknown;
    },
    onSuccess: () => {
      // Recarrega para o servidor reemitir o layout com o tema do tenant.
      window.location.assign(proximo.startsWith('/') ? proximo : '/painel');
    },
    onError: (erro: unknown) => {
      if (erro instanceof FalhaDaApi) {
        if (erro.campo === 'email' || erro.campo === 'senha') {
          setError(erro.campo, { message: erro.message });
          setErroGeral(null);
          return;
        }
        setErroGeral(erro.message);
        return;
      }
      setErroGeral('Não foi possível entrar. Tente novamente.');
    },
  });

  const ocupado = isSubmitting || entrar.isPending;

  return (
    <form
      noValidate
      className="mt-8 space-y-5"
      onSubmit={handleSubmit((dados) => {
        setErroGeral(null);
        entrar.mutate(dados);
        void roteador;
      })}
    >
      {erroGeral !== null ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-[var(--critico)]/40 bg-[var(--critico-fraco)] p-3 text-sm text-[var(--critico)]"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{erroGeral}</span>
        </div>
      ) : null}

      <Campo
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="voce@empresa.com.br"
        prefixo={<Mail className="size-4" />}
        obrigatorio
        erro={errors.email?.message}
        {...register('email')}
      />

      <div className="relative">
        <Campo
          rotulo="Senha"
          type={mostrarSenha ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          prefixo={<Lock className="size-4" />}
          obrigatorio
          erro={errors.senha?.message}
          className="[&_input]:pr-11"
          {...register('senha')}
        />
        <button
          type="button"
          onClick={() => setMostrarSenha((atual) => !atual)}
          aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-3 top-[2.15rem] text-[var(--tinta-tenue)] transition-colors hover:text-[var(--tinta)]"
        >
          {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--tinta-suave)]">
        <input
          type="checkbox"
          className="size-4 rounded border-[var(--borda-forte)] bg-[var(--superficie-2)] accent-[var(--acento-ativo)]"
          {...register('lembrar')}
        />
        Manter conectado por 30 dias
      </label>

      <Botao type="submit" variante="acento" tamanho="grande" className="w-full" carregando={ocupado}>
        {ocupado ? 'Entrando...' : 'Entrar'}
        {!ocupado ? <ArrowRight /> : null}
      </Botao>
    </form>
  );
}
