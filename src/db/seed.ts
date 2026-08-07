import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import {
  agendamento,
  agendamentoServico,
  categoriaProduto,
  categoriaServico,
  cliente,
  configuracao,
  despesa,
  empresa,
  estoque,
  formaPagamento,
  movimentacaoEstoque,
  produto,
  receita,
  servico,
  usuario,
  veiculo,
} from './schema';

/**
 * Seed de apresentação. A empresa demonstrativa é separada da plataforma e
 * cobre seis meses de operação para que painel, relatórios e estoque tenham
 * uma história coerente já no primeiro acesso.
 */

const ACENTO_PADRAO = 'tacometro';
const HEX_PADRAO = '#f59e0b';
const CNPJ_DEMO = '45598776000156';
const EMAIL_DEMO = 'demo@lumenauto.com.br';
const SENHA_DEMO = 'Demo@2026';

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

function dataDoMes(mesesAtras: number, dia: number, hora: number): Date {
  const data = new Date();
  data.setMonth(data.getMonth() - mesesAtras, dia);
  data.setHours(hora, 0, 0, 0);
  return data;
}

function dataISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function decimal(valor: number): string {
  return valor.toFixed(2);
}

async function garantirPlataforma(db: ReturnType<typeof drizzle<typeof schema>>): Promise<void> {
  const emailAdmin = exigir('SEED_SUPER_ADMIN_EMAIL', 'admin@esteticaflow.com.br').toLowerCase();
  const [plataformaExistente] = await db
    .select({ id: empresa.id })
    .from(empresa)
    .where(eq(empresa.cnpj, '19131243000197'))
    .limit(1);

  if (plataformaExistente !== undefined) return;

  const senhaAdmin = exigir('SEED_SUPER_ADMIN_SENHA');
  const nomeAdmin = exigir('SEED_SUPER_ADMIN_NOME', 'Administrador da Plataforma');
  const senhaHash = await bcrypt.hash(senhaAdmin, 10);

  await db.transaction(async (tx) => {
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
  });
}

async function criarDemonstracao(db: ReturnType<typeof drizzle<typeof schema>>): Promise<boolean> {
  const [existente] = await db
    .select({ id: empresa.id })
    .from(empresa)
    .where(eq(empresa.cnpj, CNPJ_DEMO))
    .limit(1);

  if (existente !== undefined) return false;

  const senhaHash = await bcrypt.hash(process.env.SEED_DEMO_SENHA ?? SENHA_DEMO, 10);

  await db.transaction(async (tx) => {
    const [demo] = await tx
      .insert(empresa)
      .values({
        razaoSocial: 'Lumen Auto Studio Ltda',
        nomeFantasia: 'Lumen Auto Studio',
        cnpj: CNPJ_DEMO,
        telefone: '48991628470',
        email: 'contato@lumenauto.com.br',
        plano: 'COMPLETO',
        valorMensalidade: '119.90',
        proximoVencimento: daquiAMeses(1),
      })
      .returning({ id: empresa.id });

    if (demo === undefined) throw new Error('Falha ao criar a empresa de demonstração.');

    const equipe = await tx
      .insert(usuario)
      .values([
        {
          empresaId: demo.id,
          nome: 'Isabela Moura',
          email: EMAIL_DEMO,
          senhaHash,
          papel: 'ADMINISTRADOR',
        },
        {
          empresaId: demo.id,
          nome: 'Rafael Nunes',
          email: 'rafael@lumenauto.com.br',
          senhaHash,
          papel: 'FUNCIONARIO',
        },
        {
          empresaId: demo.id,
          nome: 'Camila Prado',
          email: 'camila@lumenauto.com.br',
          senhaHash,
          papel: 'FUNCIONARIO',
        },
        {
          empresaId: demo.id,
          nome: 'Diego Azevedo',
          email: 'diego@lumenauto.com.br',
          senhaHash,
          papel: 'FUNCIONARIO',
        },
        {
          empresaId: demo.id,
          nome: 'Bianca Freitas',
          email: 'bianca@lumenauto.com.br',
          senhaHash,
          papel: 'FUNCIONARIO',
        },
      ])
      .returning({ id: usuario.id, nome: usuario.nome });

    await tx.insert(configuracao).values([
      { empresaId: demo.id, chave: 'tema.cor', valor: 'turbina' },
      { empresaId: demo.id, chave: 'tema.cor.hex', valor: '#06b6d4' },
      { empresaId: demo.id, chave: 'tema.modo', valor: 'escuro' },
      { empresaId: demo.id, chave: 'sessao.inatividade.ativa', valor: 'false' },
      { empresaId: demo.id, chave: 'sessao.inatividade.minutos', valor: '30' },
    ]);

    const pagamentos = await tx
      .insert(formaPagamento)
      .values(
        ['PIX', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'].map((nome) => ({
          empresaId: demo.id,
          nome,
        })),
      )
      .returning({ id: formaPagamento.id, nome: formaPagamento.nome });

    const categoriasServico = await tx
      .insert(categoriaServico)
      .values(
        ['Lavagem', 'Higienização', 'Polimento', 'Proteção', 'Detalhamento', 'Adicionais'].map(
          (nome) => ({ empresaId: demo.id, nome }),
        ),
      )
      .returning({ id: categoriaServico.id, nome: categoriaServico.nome });

    const categoriaDeServico = (nome: string): number => {
      const categoria = categoriasServico.find((item) => item.nome === nome);
      if (categoria === undefined) throw new Error(`Categoria de serviço ${nome} não criada.`);
      return categoria.id;
    };

    const servicos = await tx
      .insert(servico)
      .values(
        [
          ['Lavagem', 'Lavagem express', 'Lavagem externa, aspiração e pretinho.', 69.9, 45],
          [
            'Lavagem',
            'Lavagem técnica completa',
            'Pré-lavagem, dois baldes, secagem e acabamento.',
            139.9,
            100,
          ],
          [
            'Lavagem',
            'Lavagem premium SUV',
            'Limpeza detalhada externa e interna para SUVs.',
            189.9,
            130,
          ],
          [
            'Higienização',
            'Higienização interna',
            'Limpeza de bancos, carpetes, teto e sanitização.',
            469.9,
            270,
          ],
          [
            'Higienização',
            'Higienização de ar-condicionado',
            'Limpeza técnica do sistema e neutralização de odores.',
            159.9,
            75,
          ],
          [
            'Polimento',
            'Polimento comercial',
            'Realce de brilho com correção leve de imperfeições.',
            549.9,
            360,
          ],
          [
            'Polimento',
            'Polimento técnico 2 etapas',
            'Corte e refino com medição de verniz.',
            989.9,
            540,
          ],
          [
            'Proteção',
            'Vitrificação cerâmica 1 ano',
            'Coating cerâmico com preparação completa.',
            1290,
            600,
          ],
          [
            'Proteção',
            'Vitrificação cerâmica 3 anos',
            'Proteção premium com garantia de três anos.',
            1990,
            720,
          ],
          [
            'Proteção',
            'Hidratação de couro',
            'Limpeza, hidratação e proteção de couro.',
            219.9,
            120,
          ],
          [
            'Detalhamento',
            'Detalhamento de motor',
            'Limpeza segura, acabamento e proteção do cofre.',
            249.9,
            150,
          ],
          [
            'Detalhamento',
            'Detalhamento de rodas',
            'Descontaminação e proteção de rodas e caixas.',
            189.9,
            100,
          ],
          [
            'Adicionais',
            'Revitalização de plásticos',
            'Tratamento de plásticos externos desbotados.',
            179.9,
            90,
          ],
          [
            'Adicionais',
            'Cristalização de para-brisa',
            'Repelência de água e melhor visibilidade.',
            129.9,
            45,
          ],
          ['Adicionais', 'Oxi-sanitização', 'Neutralização de odores no habitáculo.', 99.9, 40],
        ].map(([categoria, nome, descricao, preco, tempo]) => ({
          empresaId: demo.id,
          categoriaServicoId: categoriaDeServico(categoria as string),
          nome: nome as string,
          descricao: descricao as string,
          preco: decimal(preco as number),
          tempoEstimadoMinutos: tempo as number,
        })),
      )
      .returning({
        id: servico.id,
        nome: servico.nome,
        preco: servico.preco,
        tempoEstimadoMinutos: servico.tempoEstimadoMinutos,
      });

    const categoriasProduto = await tx
      .insert(categoriaProduto)
      .values(
        ['Lavagem', 'Descontaminação', 'Proteção', 'Interior', 'Acessórios', 'Equipamentos'].map(
          (nome) => ({ empresaId: demo.id, nome }),
        ),
      )
      .returning({ id: categoriaProduto.id, nome: categoriaProduto.nome });

    const categoriaDeProduto = (nome: string): number => {
      const categoria = categoriasProduto.find((item) => item.nome === nome);
      if (categoria === undefined) throw new Error(`Categoria de produto ${nome} não criada.`);
      return categoria.id;
    };

    const produtos = await tx
      .insert(produto)
      .values(
        [
          ['Lavagem', 'Shampoo neutro concentrado', 'ML', 5000, 99.9, 18500, 3000],
          ['Lavagem', 'APC multiuso', 'ML', 5000, 109.9, 11200, 2000],
          ['Lavagem', 'Desengraxante cítrico', 'ML', 5000, 94.9, 7600, 1500],
          ['Lavagem', 'Pretinho para pneus', 'ML', 5000, 79.9, 6400, 1200],
          ['Descontaminação', 'Removedor de ferro', 'ML', 1000, 89.9, 2400, 500],
          ['Descontaminação', 'Clay bar média', 'UN', 1, 42.9, 9, 3],
          ['Descontaminação', 'Removedor de piche', 'ML', 1000, 74.9, 1600, 400],
          ['Proteção', 'Cera sintética premium', 'ML', 500, 139.9, 1150, 300],
          ['Proteção', 'Coating cerâmico 30 ml', 'UN', 1, 189.9, 7, 3],
          ['Proteção', 'Hidratante de couro', 'ML', 500, 64.9, 950, 250],
          ['Interior', 'Limpador de tecidos', 'ML', 5000, 119.9, 7300, 1500],
          ['Interior', 'Odorizador premium', 'ML', 500, 34.9, 820, 200],
          ['Interior', 'Sanitizante', 'ML', 1000, 52.9, 1450, 400],
          ['Acessórios', 'Microfibra 40x60', 'UN', 10, 129.9, 37, 10],
          ['Acessórios', 'Aplicador de espuma', 'UN', 1, 12.9, 2, 4],
          ['Acessórios', 'Escova para rodas', 'UN', 1, 38.9, 6, 2],
          ['Acessórios', 'Pincel de detalhamento', 'UN', 1, 24.9, 12, 3],
          ['Equipamentos', 'Filtro para aspirador', 'UN', 1, 89.9, 3, 1],
        ].map(([categoria, nome, unidade, embalagem, valor, atual, minimo]) => ({
          empresaId: demo.id,
          categoriaProdutoId: categoriaDeProduto(categoria as string),
          nome: nome as string,
          unidadeMedida: unidade as 'ML' | 'UN',
          quantidadeEmbalagem: String(embalagem),
          valorEmbalagem: decimal(valor as number),
          custoUnitario: decimal((valor as number) / (embalagem as number)),
          quantidadeAtual: String(atual),
          quantidadeMinima: String(minimo),
        })),
      )
      .returning({
        id: produto.id,
        nome: produto.nome,
        quantidadeEmbalagem: produto.quantidadeEmbalagem,
        valorEmbalagem: produto.valorEmbalagem,
      });

    await tx.insert(estoque).values(
      produtos.map((item) => {
        const origem = [
          ['18500', '3000'],
          ['11200', '2000'],
          ['7600', '1500'],
          ['6400', '1200'],
          ['2400', '500'],
          ['9', '3'],
          ['1600', '400'],
          ['1150', '300'],
          ['7', '3'],
          ['950', '250'],
          ['7300', '1500'],
          ['820', '200'],
          ['1450', '400'],
          ['37', '10'],
          ['2', '4'],
          ['6', '2'],
          ['12', '3'],
          ['3', '1'],
        ][produtos.indexOf(item)];
        return {
          empresaId: demo.id,
          produtoId: item.id,
          quantidadeAtual: origem?.[0] ?? '0',
          quantidadeMinima: origem?.[1] ?? '0',
        };
      }),
    );

    const clientes = await tx
      .insert(cliente)
      .values(
        [
          ['André Farias', '52998224725', '48988776655', 'andre@exemplo.com.br'],
          ['Marina Rocha', '87748248800', '48991234567', 'marina@exemplo.com.br'],
          ['Lucas Tavares', '11144477735', '48984561234', 'lucas@exemplo.com.br'],
          ['Fernanda Lopes', '98765432100', '48985443322', 'fernanda@exemplo.com.br'],
          ['Gustavo Reis', '12345678909', '48999887766', 'gustavo@exemplo.com.br'],
          [
            'Paula Mendes',
            '153.456.789-09'.replace(/\D/g, ''),
            '48996321458',
            'paula@exemplo.com.br',
          ],
          ['Ricardo Almeida', '06928374650', '48991239876', 'ricardo@exemplo.com.br'],
          ['Juliana Costa', '39053344705', '48987894561', 'juliana@exemplo.com.br'],
          ['Bruno Martins', '71460238001', '48993456780', 'bruno@exemplo.com.br'],
          ['Carla Pires', '93541134780', '48998123456', 'carla@exemplo.com.br'],
          ['Eduardo Vieira', '02649875301', '48987766554', 'eduardo@exemplo.com.br'],
          ['Renata Silveira', '12098456733', '48992233445', 'renata@exemplo.com.br'],
          ['Frota Sul Logística Ltda', '34028316000103', '4832221100', 'frota@frotasul.com.br'],
          ['Orion Engenharia Ltda', '19131243000197', '4833332200', 'operacao@orion.com.br'],
          ['Tiago Araujo', '74185296300', '48991122334', 'tiago@exemplo.com.br'],
          ['Aline Barros', '85274196300', '48994455667', 'aline@exemplo.com.br'],
          ['Diego Ramos', '45678912300', '48995566778', 'diego@exemplo.com.br'],
          ['Sofia Nascimento', '96385274100', '48996677889', 'sofia@exemplo.com.br'],
        ].map(([nome, cpfCnpj, telefone, email], indice) => ({
          empresaId: demo.id,
          nome: nome as string,
          cpfCnpj: cpfCnpj as string,
          telefone: telefone as string,
          email: email as string,
          cidade: indice < 12 ? 'Florianópolis' : 'São José',
          uf: 'SC',
          observacoes:
            indice % 4 === 0 ? 'Cliente recorrente. Prefere confirmação por WhatsApp.' : null,
        })),
      )
      .returning({ id: cliente.id, nome: cliente.nome });

    const veiculos = await tx
      .insert(veiculo)
      .values(
        [
          ['RTA1B23', 'Volkswagen', 'Golf GTI', 'Preto', 2022, 0],
          ['QRS1A23', 'Honda', 'Civic Touring', 'Cinza', 2021, 1],
          ['MNO4C56', 'Toyota', 'Corolla Cross', 'Branco', 2023, 2],
          ['ABC1D23', 'BMW', '320i M Sport', 'Azul', 2020, 3],
          ['DEF2E34', 'Jeep', 'Compass Limited', 'Prata', 2022, 4],
          ['GHI3F45', 'Audi', 'A3 Sedan', 'Vermelho', 2021, 5],
          ['JKL4G56', 'Porsche', 'Macan', 'Cinza', 2022, 6],
          ['MNP5H67', 'Mercedes-Benz', 'C200', 'Preto', 2020, 7],
          ['PQR6I78', 'Volvo', 'XC60', 'Branco', 2023, 8],
          ['STU7J89', 'Chevrolet', 'Onix Premier', 'Prata', 2021, 9],
          ['VWX8K90', 'Fiat', 'Toro Ranch', 'Cinza', 2022, 10],
          ['YZA9L01', 'Hyundai', 'Creta Ultimate', 'Azul', 2023, 11],
          ['BCD0M12', 'Fiat', 'Fiorino', 'Branco', 2021, 12],
          ['CDE1N23', 'Renault', 'Master', 'Branco', 2020, 13],
          ['EFG2O34', 'Ford', 'Ranger Limited', 'Preto', 2022, 14],
          ['FGH3P45', 'Volkswagen', 'T-Cross Highline', 'Branco', 2023, 15],
          ['HIJ4Q56', 'Honda', 'HR-V Touring', 'Cinza', 2022, 16],
          ['IJK5R67', 'Nissan', 'Kicks Exclusive', 'Vermelho', 2021, 17],
          ['LMN6S78', 'Tesla', 'Model 3', 'Branco', 2023, 0],
          ['NOP7T89', 'Toyota', 'Hilux SRX', 'Prata', 2022, 12],
          ['OPQ8U90', 'BYD', 'Song Plus', 'Azul', 2024, 1],
          ['PQR9V01', 'Volkswagen', 'Jetta GLI', 'Cinza', 2023, 6],
        ].map(([placa, marca, modelo, cor, ano, indiceCliente]) => ({
          empresaId: demo.id,
          clienteId: clientes[indiceCliente as number]?.id ?? 0,
          placa: placa as string,
          marca: marca as string,
          modelo: modelo as string,
          cor: cor as string,
          ano: ano as number,
        })),
      )
      .returning({ id: veiculo.id, placa: veiculo.placa, clienteId: veiculo.clienteId });

    const servicoPorNome = (nome: string) => {
      const encontrado = servicos.find((item) => item.nome === nome);
      if (encontrado === undefined) throw new Error(`Serviço ${nome} não criado.`);
      return encontrado;
    };
    const pagamentoPorNome = (nome: string) => {
      const encontrado = pagamentos.find((item) => item.nome === nome);
      if (encontrado === undefined) throw new Error(`Forma ${nome} não criada.`);
      return encontrado;
    };

    const combinacoes = [
      ['Lavagem express'],
      ['Lavagem técnica completa', 'Cristalização de para-brisa'],
      ['Lavagem premium SUV', 'Hidratação de couro'],
      ['Polimento comercial', 'Revitalização de plásticos'],
      ['Higienização interna', 'Oxi-sanitização'],
      ['Polimento técnico 2 etapas', 'Vitrificação cerâmica 1 ano'],
      ['Detalhamento de motor', 'Detalhamento de rodas'],
      ['Lavagem técnica completa', 'Higienização de ar-condicionado'],
    ];

    const historico = Array.from({ length: 6 }, (_, indice) =>
      combinacoes.map((nomes, ordem) => {
        const lista = nomes.map(servicoPorNome);
        const subtotal = lista.reduce((total, item) => total + Number(item.preco), 0);
        const desconto = ordem === 3 ? 30 : ordem === 5 ? 90 : 0;
        return {
          empresaId: demo.id,
          clienteId: clientes[(indice * 3 + ordem) % clientes.length]?.id ?? 0,
          veiculoId: veiculos[(indice * 4 + ordem) % veiculos.length]?.id ?? 0,
          responsavelId: equipe[1 + ((indice + ordem) % (equipe.length - 1))]?.id ?? null,
          dataHora: dataDoMes(5 - indice, 3 + ordem * 3, 8 + (ordem % 4) * 2),
          duracaoMinutos: String(
            lista.reduce((total, item) => total + item.tempoEstimadoMinutos, 0),
          ),
          status: 'CONCLUIDO' as const,
          observacoes: ordem % 3 === 0 ? 'Cliente solicitou fotos do antes e depois.' : null,
          subtotal: decimal(subtotal),
          desconto: decimal(desconto),
          total: decimal(subtotal - desconto),
          pago: true,
          servicos: lista,
          forma: pagamentos[(indice + ordem) % pagamentos.length]?.id ?? pagamentoPorNome('PIX').id,
        };
      }),
    ).flat();

    const inseridos = await tx
      .insert(agendamento)
      .values(historico.map(({ servicos: _servicos, forma: _forma, ...item }) => item))
      .returning({ id: agendamento.id, total: agendamento.total, dataHora: agendamento.dataHora });

    await tx.insert(agendamentoServico).values(
      inseridos.flatMap(
        (registro, indice) =>
          historico[indice]?.servicos.map((item) => ({
            empresaId: demo.id,
            agendamentoId: registro.id,
            servicoId: item.id,
            precoUnitario: item.preco,
            tempoEstimadoMinutos: String(item.tempoEstimadoMinutos),
          })) ?? [],
      ),
    );

    await tx.insert(receita).values(
      inseridos.map((registro, indice) => ({
        empresaId: demo.id,
        agendamentoId: registro.id,
        formaPagamentoId: historico[indice]?.forma ?? pagamentoPorNome('PIX').id,
        descricao: `Atendimento ${registro.id} — ${historico[indice]?.servicos.map((item) => item.nome).join(' + ')}`,
        valor: registro.total,
        dataRecebimento: dataISO(registro.dataHora),
      })),
    );

    await tx.insert(despesa).values(
      Array.from({ length: 6 }, (_, indice) => {
        const data = dataDoMes(5 - indice, 5, 12);
        const despesasDoMes: Array<{
          descricao: string;
          categoria: 'FIXA' | 'FORNECEDOR' | 'VARIAVEL';
          valor: number;
        }> = [
          { descricao: 'Aluguel do estúdio', categoria: 'FIXA', valor: 3200 },
          { descricao: 'Energia elétrica', categoria: 'FIXA', valor: 890 + indice * 25 },
          { descricao: 'Água e coleta', categoria: 'FIXA', valor: 640 + indice * 18 },
          { descricao: 'Internet e telefone', categoria: 'FIXA', valor: 179.9 },
          {
            descricao: 'Compra de produtos e reposição',
            categoria: 'FORNECEDOR',
            valor: 2100 + indice * 180,
          },
          {
            descricao: 'Marketing local e anúncios',
            categoria: 'VARIAVEL',
            valor: 680 + indice * 45,
          },
          {
            descricao: 'Manutenção de equipamentos',
            categoria: 'VARIAVEL',
            valor: 320 + (indice % 3) * 145,
          },
        ];
        return despesasDoMes.map(({ descricao, categoria, valor }) => ({
          empresaId: demo.id,
          descricao,
          categoria,
          valor: decimal(valor),
          dataPagamento: dataISO(data),
        }));
      }).flat(),
    );

    await tx.insert(movimentacaoEstoque).values(
      Array.from({ length: 6 }, (_, indice) => {
        const data = dataDoMes(5 - indice, 2, 10);
        return produtos.slice(0, 5).map((item, produtoIndice) => ({
          empresaId: demo.id,
          produtoId: item.id,
          usuarioId: equipe[1]?.id ?? null,
          tipo: 'ENTRADA' as const,
          origem: 'MANUAL' as const,
          quantidade: produtoIndice === 0 ? '5000' : produtoIndice === 4 ? '1000' : '2500',
          valorFinanceiro: produtoIndice === 0 ? '99.90' : produtoIndice === 4 ? '89.90' : '109.90',
          motivo: `Reposição programada — ${dataISO(data)}`,
          ocorridoEm: data,
        }));
      }).flat(),
    );

    const futuros = [
      ['Lavagem técnica completa', 'Cristalização de para-brisa'],
      ['Higienização interna'],
      ['Polimento comercial', 'Revitalização de plásticos'],
      ['Lavagem premium SUV', 'Hidratação de couro'],
    ].map((nomes, indice) => {
      const lista = nomes.map(servicoPorNome);
      const subtotal = lista.reduce((total, item) => total + Number(item.preco), 0);
      return {
        empresaId: demo.id,
        clienteId: clientes[(indice + 4) % clientes.length]?.id ?? 0,
        veiculoId: veiculos[(indice + 5) % veiculos.length]?.id ?? 0,
        responsavelId: equipe[1 + (indice % (equipe.length - 1))]?.id ?? null,
        dataHora: dataDoMes(-1, 8 + indice, 9 + indice * 2),
        duracaoMinutos: String(lista.reduce((total, item) => total + item.tempoEstimadoMinutos, 0)),
        status: indice === 0 ? ('EM_ANDAMENTO' as const) : ('AGENDADO' as const),
        observacoes: 'Agendamento de demonstração para a agenda da semana.',
        subtotal: decimal(subtotal),
        desconto: '0.00',
        total: decimal(subtotal),
        pago: false,
      };
    });
    await tx.insert(agendamento).values(futuros);
  });

  return true;
}

async function principal(): Promise<void> {
  const url = exigir('DATABASE_URL');
  const conexao = postgres(url, { max: 1, prepare: false });
  const db = drizzle(conexao, { schema, casing: 'snake_case' });

  try {
    await garantirPlataforma(db);
    const criada = await criarDemonstracao(db);

    if (criada) {
      console.warn('✓ Empresa de demonstração criada: Lumen Auto Studio.');
      console.warn(`  Acesso: ${EMAIL_DEMO} · senha ${process.env.SEED_DEMO_SENHA ?? SENHA_DEMO}`);
    } else {
      console.warn('› A empresa de demonstração já existe. Nenhum dado foi duplicado.');
    }
  } finally {
    await conexao.end();
  }
}

principal().catch((excecao: unknown) => {
  console.error('✕ Falha no seed:', excecao);
  process.exit(1);
});
