'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Botao } from '@/components/ui/botao';
import { AreaDeTexto, Campo } from '@/components/ui/campo';
import { Dialogo } from '@/components/ui/dialogo';
import { useSalvarVeiculo } from '@/hooks/use-clientes';
import { veiculoSchema, type VeiculoInput, type VeiculoPayload } from '@/schemas';

export interface ValoresIniciaisVeiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  cor: string | null;
  ano: number | null;
  observacoes: string | null;
}

export function FormularioDeVeiculo({
  aberto,
  aoFechar,
  clienteId,
  inicial,
}: {
  aberto: boolean;
  aoFechar: () => void;
  clienteId: number;
  inicial?: ValoresIniciaisVeiculo | undefined;
}) {
  const salvar = useSalvarVeiculo(inicial?.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VeiculoInput>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: {
      clienteId,
      placa: '',
      marca: '',
      modelo: '',
      cor: '',
      ano: '',
      observacoes: '',
    },
  });

  useEffect(() => {
    if (!aberto) return;
    reset({
      clienteId,
      placa: inicial?.placa ?? '',
      marca: inicial?.marca ?? '',
      modelo: inicial?.modelo ?? '',
      cor: inicial?.cor ?? '',
      ano: inicial?.ano ?? '',
      observacoes: inicial?.observacoes ?? '',
    });
  }, [aberto, clienteId, inicial, reset]);

  const enviar = handleSubmit((dados) => {
    salvar.mutate(dados as unknown as VeiculoPayload, { onSuccess: aoFechar });
  });

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={(estado) => {
        if (!estado) aoFechar();
      }}
      largura="estreita"
      titulo={inicial === undefined ? 'Novo veículo' : 'Editar veículo'}
      descricao="Aceita placa antiga (ABC1234) e Mercosul (ABC1D23)."
      rodape={
        <>
          <Botao variante="fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            variante="acento"
            onClick={() => void enviar()}
            carregando={isSubmitting || salvar.isPending}
          >
            Salvar
          </Botao>
        </>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          void enviar();
        }}
      >
        <input type="hidden" {...register('clienteId')} />

        <Campo
          rotulo="Placa"
          obrigatorio
          placeholder="ABC1D23"
          className="[&_input]:uppercase [&_input]:tracking-widest"
          erro={errors.placa?.message}
          {...register('placa')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Marca"
            obrigatorio
            placeholder="Volkswagen"
            erro={errors.marca?.message}
            {...register('marca')}
          />
          <Campo
            rotulo="Modelo"
            obrigatorio
            placeholder="Golf GTI"
            erro={errors.modelo?.message}
            {...register('modelo')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Cor" placeholder="Preto" erro={errors.cor?.message} {...register('cor')} />
          <Campo
            rotulo="Ano"
            inputMode="numeric"
            placeholder="2022"
            erro={errors.ano?.message}
            {...register('ano')}
          />
        </div>

        <AreaDeTexto
          rotulo="Observações"
          placeholder="Detalhes de pintura, avarias conhecidas, cuidados especiais..."
          erro={errors.observacoes?.message}
          {...register('observacoes')}
        />
      </form>
    </Dialogo>
  );
}
