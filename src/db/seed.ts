import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as schema from './schema';
import {
  categoriaProduto,
  categoriaServico,
  cliente,
  configuracao,
  empresa,
  estoque,
  formaPagamento,
  produto,
  servico,
  usuario,
  veiculo,
} from './schema';

/**
 * Semeia o ambiente com uma empresa de demonstracao e o administrador da
 * plataforma. As credenciais vem do ambiente: nenhuma senha e versionada.
 */

const ACENTO_PADRAO = 'tacometro';
const HEX_PADRAO = '#f59e0b';

function exigir(nome: string, padrao?: string): string {
  const valor = process.env[nome] ?? padrao;
  if (valor === undefined || valor === '') {
    throw new Error(`Variável ${nome} é obrigatória para o seed.`);
  }
  return valor;
}

function daquiAMeses(meses: number): string {
  const data = new Date();
  data.setMonth(data.getMonth() + meses);
  return data.toISOString().slice(0, 10);
}

async function principal(): Promise<void> {
  const url = exigir('DATABASE_URL');
  const conexao = postgres(url, { max: 1, prepare: false });
  const db = drizzle(conexao, { schema, casing: 'snake_case' });

  const emailAdmin = exigir('SEED_SUPER_ADMIN_EMAIL', 'admin@esteticaflow.com.br').toLowerCase();
  const senhaAdmin = exigir('SEED_SUPER_ADMIN_SENHA');
  const nomeAdmin = exigir('SEED_SUPER_ADMIN_NOME', 'Administrador da Plataforma');

  const [jaExiste] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(eq(usuario.email, emailAdmin))
    .limit(1);

  if (jaExiste !== undefined) {
    console.warn('› Seed já aplicado: administrador da plataforma existe. Nada a fazer.');
    await conexao.end();
    return;
  }

  const senhaHash = await bcrypt.hash(senhaAdmin, 10);

  await db.transaction(async (tx) => {
    // -- Empresa da plataforma -------------------------------------------
    const [plataforma] = await tx
      .insert(empresa)
      .values({
        razaoSocial: 'EsteticaFlow Tecnologia Ltda',
        nomeFantasia: 'EsteticaFlow',
        cnpj: '19131243000197',
        email: 'gabrielcardossso@gmail.com',
        plano: 'COMPLETO',
        valorMensalidade: '0.00',
        proximoVencimento: daquiAMeses(120),
      })
      .returning({ id: empresa.id });

    if (plataforma === undefined) throw new Error('Falha ao criar a empresa da plataforma.');

    await tx.insert(usuario).values({
      empresaId: plataforma.id,
      nome: nomeAdmin,
      email: emailAdmin,
      senhaHash,
      papel: 'SUPER_ADMIN',
    });

    await tx.insert(configuracao).values([
      { empresaId: plataforma.id, chave: 'tema.cor', valor: ACENTO_PADRAO },
      { empresaId: plataforma.id, chave: 'tema.cor.hex', valor: HEX_PADRAO },
      { empresaId: plataforma.id, chave: 'tema.modo', valor: 'escuro' },
      { empresaId: plataforma.id, chave: 'sessao.inatividade.ativa', valor: 'false' },
      { empresaId: plataforma.id, chave: 'sessao.inatividade.minutos', valor: '30' },
    ]);

    // -- Empresa de demonstracao -----------------------------------------
    const [demo] = await tx
      .insert(empresa)
      .values({
        razaoSocial: 'Garagem Prime Estética Automotiva Ltda',
        nomeFantasia: 'Garagem Prime',
        cnpj: '11222333000181',
        telefone: '48991746960',
        email: 'contato@garagemprime.com.br',
        plano: 'COMPLETO',
        valorMensalidade: '119.90',
        proximoVencimento: daquiAMeses(1),
      })
      .returning({ id: empresa.id });

    if (demo === undefined) throw new Error('Falha ao criar a empresa de demonstração.');

    await tx.insert(usuario).values([
      {
        empresaId: demo.id,
        nome: 'Ana Duarte',
        email: 'ana@garagemprime.com.br',
        senhaHash,
        papel: 'ADMINISTRADOR',
      },
      {
        empresaId: demo.id,
        nome: 'Bruno Lima',
        email: 'bruno@garagemprime.com.br',
        senhaHash,
        papel: 'FUNCIONARIO',
      },
    ]);

    await tx.insert(configuracao).values([
      { empresaId: demo.id, chave: 'tema.cor', valor: 'turbina' },
      { empresaId: demo.id, chave: 'tema.cor.hex', valor: '#06b6d4' },
      { empresaId: demo.id, chave: 'tema.modo', valor: 'escuro' },
      { empresaId: demo.id, chave: 'sessao.inatividade.ativa', valor: 'false' },
      { empresaId: demo.id, chave: 'sessao.inatividade.minutos', valor: '30' },
    ]);

    await tx.insert(formaPagamento).values(
      ['Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito'].map((nome) => ({
        empresaId: demo.id,
        nome,
      })),
    );

    const categoriasServico = await tx
      .insert(categoriaServico)
      .values(
        ['Lavagem', 'Polimento', 'Vitrificação', 'Higienização'].map((nome) => ({
          empresaId: demo.id,
          nome,
        })),
      )
      .returning({ id: categoriaServico.id, nome: categoriaServico.nome });

    const idCategoria = (nome: string): number => {
      const encontrada = categoriasServico.find((c) => c.nome === nome);
      if (encontrada === undefined) throw new Error(`Categoria ${nome} não criada.`);
      return encontrada.id;
    };

    await tx.insert(servico).values([
      {
        empresaId: demo.id,
        categoriaServicoId: idCategoria('Lavagem'),
        nome: 'Lavagem técnica completa',
        descricao: 'Lavagem em dois baldes, descontaminação e secagem com blower.',
        preco: '120.00',
        tempoEstimadoMinutos: 90,
      },
      {
        empresaId: demo.id,
        categoriaServicoId: idCategoria('Lavagem'),
        nome: 'Lavagem simples',
        descricao: 'Lavagem externa com secagem.',
        preco: '70.00',
        tempoEstimadoMinutos: 45,
      },
      {
        empresaId: demo.id,
        categoriaServicoId: idCategoria('Polimento'),
        nome: 'Polimento técnico 2 etapas',
        descricao: 'Correção de verniz com corte e refino.',
        preco: '890.00',
        tempoEstimadoMinutos: 480,
      },
      {
        empresaId: demo.id,
        categoriaServicoId: idCategoria('Vitrificação'),
        nome: 'Vitrificação cerâmica 3 anos',
        descricao: 'Aplicação de coating cerâmico com garantia de 3 anos.',
        preco: '1890.00',
        tempoEstimadoMinutos: 600,
      },
      {
        empresaId: demo.id,
        categoriaServicoId: idCategoria('Higienização'),
        nome: 'Higienização interna completa',
        descricao: 'Extração de estofados, carpetes e teto.',
        preco: '450.00',
        tempoEstimadoMinutos: 240,
      },
    ]);

    const categoriasProduto = await tx
      .insert(categoriaProduto)
      .values(
        ['Shampoo e detergentes', 'Ceras e selantes', 'Panos e acessórios'].map((nome) => ({
          empresaId: demo.id,
          nome,
        })),
      )
      .returning({ id: categoriaProduto.id, nome: categoriaProduto.nome });

    const idCategoriaProduto = (nome: string): number => {
      const encontrada = categoriasProduto.find((c) => c.nome === nome);
      if (encontrada === undefined) throw new Error(`Categoria ${nome} não criada.`);
      return encontrada.id;
    };

    const produtos = await tx
      .insert(produto)
      .values([
        {
          empresaId: demo.id,
          categoriaProdutoId: idCategoriaProduto('Shampoo e detergentes'),
          nome: 'Shampoo neutro concentrado',
          unidadeMedida: 'ML' as const,
          quantidadeEmbalagem: '5000.000',
          valorEmbalagem: '89.90',
          custoUnitario: '0.0180',
        },
        {
          empresaId: demo.id,
          categoriaProdutoId: idCategoriaProduto('Ceras e selantes'),
          nome: 'Selante sintético',
          unidadeMedida: 'ML' as const,
          quantidadeEmbalagem: '500.000',
          valorEmbalagem: '149.90',
          custoUnitario: '0.2998',
        },
        {
          empresaId: demo.id,
          categoriaProdutoId: idCategoriaProduto('Panos e acessórios'),
          nome: 'Microfibra 40x60',
          unidadeMedida: 'UN' as const,
          quantidadeEmbalagem: '10.000',
          valorEmbalagem: '120.00',
          custoUnitario: '12.0000',
        },
      ])
      .returning({ id: produto.id, nome: produto.nome });

    await tx.insert(estoque).values([
      {
        empresaId: demo.id,
        produtoId: produtos[0]?.id ?? 0,
        quantidadeAtual: '12000.000',
        quantidadeMinima: '2000.000',
      },
      {
        empresaId: demo.id,
        produtoId: produtos[1]?.id ?? 0,
        quantidadeAtual: '300.000',
        quantidadeMinima: '500.000',
      },
      {
        empresaId: demo.id,
        produtoId: produtos[2]?.id ?? 0,
        quantidadeAtual: '24.000',
        quantidadeMinima: '10.000',
      },
    ]);

    const clientes = await tx
      .insert(cliente)
      .values([
        {
          empresaId: demo.id,
          nome: 'Carlos Menezes',
          cpfCnpj: '52998224725',
          telefone: '48988776655',
          email: 'carlos@exemplo.com.br',
          cep: '88015200',
          logradouro: 'Rua Bocaiúva',
          numero: '1200',
          bairro: 'Centro',
          cidade: 'Florianópolis',
          uf: 'SC',
        },
        {
          empresaId: demo.id,
          nome: 'Marina Rocha',
          cpfCnpj: '87748248800',
          telefone: '48991234567',
          email: 'marina@exemplo.com.br',
          cidade: 'São José',
          uf: 'SC',
        },
        {
          empresaId: demo.id,
          nome: 'Transportes Vega Ltda',
          cpfCnpj: '34028316000103',
          telefone: '4832221100',
          email: 'frota@vega.com.br',
          cidade: 'Palhoça',
          uf: 'SC',
        },
      ])
      .returning({ id: cliente.id, nome: cliente.nome });

    await tx.insert(veiculo).values([
      {
        empresaId: demo.id,
        clienteId: clientes[0]?.id ?? 0,
        placa: 'MJK4F21',
        marca: 'Volkswagen',
        modelo: 'Golf GTI',
        cor: 'Preto',
        ano: 2022,
      },
      {
        empresaId: demo.id,
        clienteId: clientes[1]?.id ?? 0,
        placa: 'QRS1A23',
        marca: 'Honda',
        modelo: 'Civic Touring',
        cor: 'Cinza',
        ano: 2021,
      },
      {
        empresaId: demo.id,
        clienteId: clientes[2]?.id ?? 0,
        placa: 'ABC1234',
        marca: 'Fiat',
        modelo: 'Fiorino',
        cor: 'Branco',
        ano: 2019,
      },
    ]);
  });

  console.warn('✓ Seed concluído.');
  console.warn(`  Administrador da plataforma: ${emailAdmin}`);
  console.warn('  Empresa demo: ana@garagemprime.com.br (administradora)');

  await conexao.end();
}

principal().catch((excecao: unknown) => {
  console.error('✗ Falha no seed:', excecao);
  process.exit(1);
});
