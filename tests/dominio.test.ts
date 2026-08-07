import { describe, expect, it } from 'vitest';
import {
  avaliarConflito,
  calcularTotais,
  podeRegistrarPagamento,
  transicionar,
  validarDataHora,
} from '@/domain/agendamento';
import { classificarRelacionamento, linkWhatsApp } from '@/domain/cliente';
import {
  calcularCustoUnitario,
  calcularValorDaCompra,
  nivelDoEstoque,
  validarBaixa,
} from '@/domain/estoque';
import {
  diasEmAtraso,
  elegivelParaBloqueio,
  limiteDeUsuarios,
  permiteRecurso,
  podeAcessar,
  recalcularStatus,
} from '@/domain/plano';
import { montarResumo, resolverPeriodo } from '@/domain/relatorio';
import { Dinheiro, Quantidade } from '@/domain/shared/decimal';
import {
  cnpjValido,
  cpfOuCnpjValido,
  cpfValido,
  formatarTelefone,
  placaValida,
} from '@/domain/shared/documento';
import { m } from '@/domain/shared/tempo';
import { acentoLegivel, razaoDeContraste, resolverTema } from '@/domain/tema';

// ---------------------------------------------------------------------------
// Aritmética decimal
// ---------------------------------------------------------------------------

describe('Dinheiro', () => {
  it('soma sem erro de ponto flutuante', () => {
    expect(Dinheiro.somar('0.10', '0.20')).toBe('0.30');
    expect(Dinheiro.somar('1999.99', '0.01')).toBe('2000.00');
  });

  it('arredonda pela metade para cima', () => {
    expect(Dinheiro.de('1.005')).toBe('1.01');
    expect(Dinheiro.de('1.004')).toBe('1.00');
  });

  it('divide com duas casas', () => {
    expect(Dinheiro.dividir('100.00', 3)).toBe('33.33');
  });

  it('multiplica preservando escala', () => {
    expect(Dinheiro.multiplicar('12.50', '3')).toBe('37.50');
  });

  it('compara corretamente', () => {
    expect(Dinheiro.comparar('10.00', '9.99')).toBe(1);
    expect(Dinheiro.comparar('10.00', '10.00')).toBe(0);
  });
});

describe('Quantidade', () => {
  it('opera com três casas', () => {
    expect(Quantidade.subtrair('10.000', '0.125')).toBe('9.875');
  });
});

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

describe('documentos', () => {
  it('valida CPF pelo dígito verificador', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
  });

  it('valida CNPJ pelo dígito verificador', () => {
    expect(cnpjValido('19.131.243/0001-97')).toBe(true);
    expect(cnpjValido('19.131.243/0001-98')).toBe(false);
  });

  it('trata documento vazio como válido, porque é opcional', () => {
    expect(cpfOuCnpjValido('')).toBe(true);
    expect(cpfOuCnpjValido(null)).toBe(true);
    expect(cpfOuCnpjValido('123')).toBe(false);
  });

  it('aceita placa antiga e Mercosul', () => {
    expect(placaValida('ABC1234')).toBe(true);
    expect(placaValida('abc-1234')).toBe(true);
    expect(placaValida('ABC1D23')).toBe(true);
    expect(placaValida('AB12345')).toBe(false);
  });

  it('formata telefone com 10 e 11 dígitos', () => {
    expect(formatarTelefone('48991746960')).toBe('(48) 99174-6960');
    expect(formatarTelefone('4832221100')).toBe('(48) 3222-1100');
  });
});

// ---------------------------------------------------------------------------
// Agendamento
// ---------------------------------------------------------------------------

const servico = (id: number, preco: string, minutos: number) => ({
  id,
  nome: `Serviço ${id}`,
  preco,
  tempoEstimadoMinutos: minutos,
});

describe('cálculo do atendimento', () => {
  it('soma os serviços e aplica desconto', () => {
    const resultado = calcularTotais([servico(1, '120.00', 90), servico(2, '80.00', 45)], '20.00');

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value.subtotal).toBe('200.00');
    expect(resultado.value.total).toBe('180.00');
    expect(resultado.value.duracaoMinutos).toBe(135);
  });

  it('rejeita desconto maior ou igual ao subtotal', () => {
    const resultado = calcularTotais([servico(1, '100.00', 60)], '100.00');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error.campo).toBe('desconto');
  });

  it('rejeita serviço repetido', () => {
    const resultado = calcularTotais([servico(1, '100.00', 60), servico(1, '100.00', 60)], '0');
    expect(resultado.ok).toBe(false);
  });

  it('rejeita lista vazia', () => {
    expect(calcularTotais([], '0').ok).toBe(false);
  });

  it('não permite agendar no passado', () => {
    const ontem = m().subtract(1, 'day').toDate();
    expect(validarDataHora(ontem).ok).toBe(false);
    expect(validarDataHora(m().add(2, 'hours').toDate()).ok).toBe(true);
  });
});

describe('conflito de horário', () => {
  const base = m('2030-06-10T10:00:00').toDate();
  const existente = {
    id: 1,
    dataHora: base,
    duracaoMinutos: 60,
    responsavelId: 7,
  };

  it('bloqueia quando o mesmo profissional já está ocupado', () => {
    const resultado = avaliarConflito(
      { dataHora: m(base).add(30, 'minutes').toDate(), duracaoMinutos: 60, responsavelId: 7 },
      [existente],
    );
    expect(resultado.tipo).toBe('BLOQUEADO');
  });

  it('apenas avisa quando o novo atendimento não tem responsável', () => {
    const resultado = avaliarConflito(
      { dataHora: m(base).add(30, 'minutes').toDate(), duracaoMinutos: 60, responsavelId: null },
      [existente],
    );
    expect(resultado.tipo).toBe('PRECISA_CONFIRMACAO');
  });

  it('libera quando profissionais são diferentes', () => {
    const resultado = avaliarConflito(
      { dataHora: m(base).add(30, 'minutes').toDate(), duracaoMinutos: 60, responsavelId: 9 },
      [existente],
    );
    expect(resultado.tipo).toBe('LIVRE');
  });

  it('libera quando não há sobreposição', () => {
    const resultado = avaliarConflito(
      { dataHora: m(base).add(2, 'hours').toDate(), duracaoMinutos: 60, responsavelId: 7 },
      [existente],
    );
    expect(resultado.tipo).toBe('LIVRE');
  });
});

describe('máquina de estados do atendimento', () => {
  it('segue o caminho feliz', () => {
    const iniciado = transicionar('AGENDADO', 'INICIAR');
    expect(iniciado.ok && iniciado.value).toBe('EM_ANDAMENTO');

    const concluido = transicionar('EM_ANDAMENTO', 'CONCLUIR');
    expect(concluido.ok && concluido.value).toBe('CONCLUIDO');
  });

  it('impede concluir o que não começou', () => {
    expect(transicionar('AGENDADO', 'CONCLUIR').ok).toBe(false);
  });

  it('impede cancelar o que já foi concluído', () => {
    expect(transicionar('CONCLUIDO', 'CANCELAR').ok).toBe(false);
  });

  it('permite pagar em andamento e concluído, mas não duas vezes', () => {
    expect(podeRegistrarPagamento('EM_ANDAMENTO', false)).toBe(true);
    expect(podeRegistrarPagamento('CONCLUIDO', false)).toBe(true);
    expect(podeRegistrarPagamento('CONCLUIDO', true)).toBe(false);
    expect(podeRegistrarPagamento('AGENDADO', false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

describe('custo e compra de estoque', () => {
  const galao = { quantidadeEmbalagem: '5000.000', valorEmbalagem: '89.90' };

  it('deriva o custo unitário da embalagem', () => {
    const resultado = calcularCustoUnitario('89.90', '5000');
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value).toBe('0.0180');
  });

  it('calcula a compra proporcional ao conteúdo, não por unidade', () => {
    const resultado = calcularValorDaCompra(galao, '5000');
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value).toBe('89.90');
  });

  it('cobra meia embalagem pela metade', () => {
    const resultado = calcularValorDaCompra(galao, '2500');
    expect(resultado.ok && resultado.value).toBe('44.95');
  });

  it('respeita o valor informado pelo usuário', () => {
    const resultado = calcularValorDaCompra(galao, '5000', '75.00');
    expect(resultado.ok && resultado.value).toBe('75.00');
  });

  it('rejeita valor negativo', () => {
    expect(calcularValorDaCompra(galao, '100', '-1').ok).toBe(false);
  });

  it('impede baixa acima do saldo', () => {
    expect(validarBaixa('10.000', '20.000', 'Shampoo').ok).toBe(false);
    const baixa = validarBaixa('10.000', '4.000', 'Shampoo');
    expect(baixa.ok && baixa.value).toBe('6.000');
  });

  it('classifica o nível do estoque', () => {
    expect(nivelDoEstoque('0.000', '5.000')).toBe('CRITICO');
    expect(nivelDoEstoque('4.000', '5.000')).toBe('BAIXO');
    expect(nivelDoEstoque('5.500', '5.000')).toBe('SAUDAVEL');
    expect(nivelDoEstoque('100.000', '5.000')).toBe('SAUDAVEL');
  });
});

// ---------------------------------------------------------------------------
// Planos e assinatura
// ---------------------------------------------------------------------------

describe('matriz de planos', () => {
  it('restringe estoque e financeiro ao plano Pro', () => {
    expect(permiteRecurso('BASICO', 'ADMINISTRADOR', 'ESTOQUE')).toBe(false);
    expect(permiteRecurso('COMPLETO', 'ADMINISTRADOR', 'ESTOQUE')).toBe(true);
    expect(permiteRecurso('BASICO', 'ADMINISTRADOR', 'AGENDA')).toBe(true);
  });

  it('deixa o administrador da plataforma atravessar o gate', () => {
    expect(permiteRecurso('BASICO', 'SUPER_ADMIN', 'ESTOQUE')).toBe(true);
  });

  it('aplica o limite de usuários por plano', () => {
    expect(limiteDeUsuarios('BASICO')).toBe(2);
    expect(limiteDeUsuarios('COMPLETO')).toBe(10);
  });
});

describe('ciclo da assinatura', () => {
  const vencimento = '2030-01-10';

  it('marca atraso depois do vencimento', () => {
    expect(
      recalcularStatus(
        { ativo: true, status: 'ATIVA', proximoVencimento: vencimento },
        '2030-01-11',
      ),
    ).toBe('EM_ATRASO');
    expect(
      recalcularStatus(
        { ativo: true, status: 'ATIVA', proximoVencimento: vencimento },
        '2030-01-10',
      ),
    ).toBe('ATIVA');
  });

  it('não reativa sozinha empresa bloqueada ou cancelada', () => {
    expect(
      recalcularStatus(
        { ativo: true, status: 'BLOQUEADA', proximoVencimento: '2030-12-31' },
        '2030-01-01',
      ),
    ).toBe('BLOQUEADA');
  });

  it('só fica elegível a bloqueio após mais de 7 dias', () => {
    expect(diasEmAtraso(vencimento, '2030-01-17')).toBe(7);
    expect(elegivelParaBloqueio(vencimento, '2030-01-17')).toBe(false);
    expect(elegivelParaBloqueio(vencimento, '2030-01-18')).toBe(true);
  });

  it('empresa em atraso ainda acessa; bloqueada não', () => {
    expect(podeAcessar({ ativo: true, status: 'EM_ATRASO', proximoVencimento: vencimento })).toBe(
      true,
    );
    expect(podeAcessar({ ativo: true, status: 'BLOQUEADA', proximoVencimento: vencimento })).toBe(
      false,
    );
    expect(podeAcessar({ ativo: false, status: 'ATIVA', proximoVencimento: vencimento })).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// Relacionamento e relatórios
// ---------------------------------------------------------------------------

describe('relacionamento do cliente', () => {
  it('classifica pela distância do último atendimento', () => {
    expect(classificarRelacionamento(null)).toBe('SEM_ATENDIMENTO');
    expect(classificarRelacionamento('2030-01-01', '2030-01-20')).toBe('ATIVO');
    expect(classificarRelacionamento('2030-01-01', '2030-03-01')).toBe('EM_RISCO');
    expect(classificarRelacionamento('2030-01-01', '2030-06-01')).toBe('INATIVO');
  });

  it('monta link de WhatsApp com DDI', () => {
    expect(linkWhatsApp('48991746960')).toContain('wa.me/5548991746960');
    expect(linkWhatsApp('123')).toBeNull();
  });
});

describe('períodos de relatório', () => {
  it('resolve a semana de segunda a domingo', () => {
    const periodo = resolverPeriodo('SEMANA', '2030-06-12');
    expect(periodo.inicio).toBe('2030-06-10');
    expect(periodo.fim).toBe('2030-06-16');
  });

  it('resolve o mês respeitando ano bissexto', () => {
    const periodo = resolverPeriodo('MES', '2028-02-15');
    expect(periodo.inicio).toBe('2028-02-01');
    expect(periodo.fim).toBe('2028-02-29');
  });

  it('resolve seis meses atravessando o ano', () => {
    const periodo = resolverPeriodo('ULTIMOS_6_MESES', '2030-02-15');
    expect(periodo.inicio).toBe('2029-09-01');
    expect(periodo.fim).toBe('2030-02-28');
  });

  it('calcula ticket médio e margem', () => {
    const resumo = montarResumo('1000.00', '400.00', 4);
    expect(resumo.saldo).toBe('600.00');
    expect(resumo.ticketMedio).toBe('250.00');
    expect(resumo.margem).toBe(60);
  });

  it('não divide por zero quando não houve atendimento', () => {
    expect(montarResumo('0.00', '0.00', 0).ticketMedio).toBe('0.00');
  });
});

// ---------------------------------------------------------------------------
// Tema
// ---------------------------------------------------------------------------

describe('tema', () => {
  it('ignora personalização fora do plano', () => {
    const tema = resolverTema({ cor: 'turbina', hex: '#06b6d4', modo: 'claro' }, false);
    expect(tema.acento).toBe('tacometro');
    expect(tema.modo).toBe('claro');
  });

  it('aceita acento do catálogo quando o plano permite', () => {
    const tema = resolverTema({ cor: 'turbina', modo: 'escuro' }, true);
    expect(tema.acento).toBe('turbina');
    expect(tema.hex).toBe('#06b6d4');
  });

  it('cai no padrão diante de valor inválido', () => {
    expect(resolverTema({ cor: 'roxo-neon' }, true).acento).toBe('tacometro');
  });

  it('ajusta o acento até atingir contraste AA', () => {
    const ajustado = acentoLegivel('#1a1a1a', '#0b0e13');
    expect(razaoDeContraste(ajustado, '#0b0e13')).toBeGreaterThanOrEqual(4.5);
  });
});
