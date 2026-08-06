'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Botao } from '@/components/ui/botao';
import { AreaDeTexto, Campo } from '@/components/ui/campo';
import { Dialogo } from '@/components/ui/dialogo';
import { formatarCep, formatarCpfCnpj, formatarTelefone } from '@/domain/shared/documento';
import { useSalvarCliente } from '@/hooks/use-clientes';
import { clienteSchema, type ClienteInput, type ClientePayload } from '@/schemas';

const VAZIO: ClienteInput = {
  nome: '',
  cpfCnpj: '',
  telefone: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  observacoes: '',
};

export interface ValoresIniciaisCliente {
  id: number;
  nome: string;
  cpfCnpj: string | null;
  telefone: string;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  observacoes: string | null;
}

export function FormularioDeCliente({
  aberto,
  aoFechar,
  inicial,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  inicial?: ValoresIniciaisCliente | undefined;
  aoSalvar?: ((id: number) => void) | undefined;
}) {
  const salvar = useSalvarCliente(inicial?.id);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: VAZIO,
  });

  useEffect(() => {
    if (!aberto) return;
    reset(
      inicial === undefined
        ? VAZIO
        : {
            nome: inicial.nome,
            cpfCnpj: formatarCpfCnpj(inicial.cpfCnpj) === '—' ? '' : (inicial.cpfCnpj ?? ''),
            telefone: inicial.telefone,
            email: inicial.email ?? '',
            cep: inicial.cep ?? '',
            logradouro: inicial.logradouro ?? '',
            numero: inicial.numero ?? '',
            complemento: inicial.complemento ?? '',
            bairro: inicial.bairro ?? '',
            cidade: inicial.cidade ?? '',
            uf: inicial.uf ?? '',
            observacoes: inicial.observacoes ?? '',
          },
    );
  }, [aberto, inicial, reset]);

  const enviar = handleSubmit((dados) => {
    salvar.mutate(dados as unknown as ClientePayload, {
      onSuccess: (retorno) => {
        aoSalvar?.(retorno.id);
        aoFechar();
      },
      onError: (erro: unknown) => {
        const campo = (erro as { campo?: string }).campo;
        if (campo !== undefined && campo in VAZIO) {
          setError(campo as keyof ClienteInput, {
            message: (erro as Error).message,
          });
        }
      },
    });
  });

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={(estado) => {
        if (!estado) aoFechar();
      }}
      titulo={inicial === undefined ? 'Novo cliente' : 'Editar cliente'}
      descricao="Telefone é obrigatório: é por ele que o contato de reativação acontece."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar} type="button">
            Cancelar
          </Botao>
          <Botao
            variante="acento"
            onClick={() => void enviar()}
            carregando={isSubmitting || salvar.isPending}
          >
            {inicial === undefined ? 'Cadastrar' : 'Salvar alterações'}
          </Botao>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          void enviar();
        }}
        className="space-y-5"
      >
        <fieldset className="space-y-4">
          <legend className="rotulo-tecnico mb-2">Identificação</legend>
          <Campo rotulo="Nome" obrigatorio erro={errors.nome?.message} {...register('nome')} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Telefone"
              obrigatorio
              inputMode="tel"
              placeholder="(48) 99999-9999"
              ajuda="Com DDD, 10 ou 11 dígitos"
              erro={errors.telefone?.message}
              {...register('telefone')}
            />
            <Campo
              rotulo="CPF ou CNPJ"
              inputMode="numeric"
              placeholder="Opcional"
              erro={errors.cpfCnpj?.message}
              {...register('cpfCnpj')}
            />
          </div>

          <Campo
            rotulo="E-mail"
            type="email"
            placeholder="Opcional"
            erro={errors.email?.message}
            {...register('email')}
          />
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="rotulo-tecnico mb-2">Endereço</legend>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Campo
              rotulo="CEP"
              inputMode="numeric"
              placeholder="00000-000"
              erro={errors.cep?.message}
              {...register('cep')}
            />
            <Campo
              rotulo="Logradouro"
              erro={errors.logradouro?.message}
              {...register('logradouro')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Número" erro={errors.numero?.message} {...register('numero')} />
            <Campo
              rotulo="Complemento"
              erro={errors.complemento?.message}
              {...register('complemento')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr]">
            <Campo rotulo="Bairro" erro={errors.bairro?.message} {...register('bairro')} />
            <Campo rotulo="Cidade" erro={errors.cidade?.message} {...register('cidade')} />
            <Campo
              rotulo="UF"
              maxLength={2}
              placeholder="SC"
              erro={errors.uf?.message}
              {...register('uf')}
            />
          </div>
        </fieldset>

        <AreaDeTexto
          rotulo="Observações"
          placeholder="Preferências do cliente, cuidados com a pintura, restrições..."
          erro={errors.observacoes?.message}
          {...register('observacoes')}
        />

        {inicial !== undefined ? (
          <p className="text-xs text-[var(--tinta-tenue)]">
            Telefone atual: {formatarTelefone(inicial.telefone)}
            {inicial.cep !== null ? ` · CEP ${formatarCep(inicial.cep)}` : ''}
          </p>
        ) : null}
      </form>
    </Dialogo>
  );
}
