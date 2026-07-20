package br.esteticadesk.appointment.service;

import br.esteticadesk.appointment.dto.ServicoDTO;
import br.esteticadesk.appointment.entity.CategoriaServico;
import br.esteticadesk.appointment.entity.Servico;
import br.esteticadesk.appointment.repository.CategoriaServicoRepository;
import br.esteticadesk.appointment.repository.ServicoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ServicoService {
    private final ServicoRepository servicos;
    private final CategoriaServicoRepository categorias;
    private final SessaoUsuario sessao;

    public ServicoService(ServicoRepository servicos, CategoriaServicoRepository categorias, SessaoUsuario sessao) {
        this.servicos = servicos;
        this.categorias = categorias;
        this.sessao = sessao;
    }

    @Transactional(readOnly = true)
    public List<Servico> listar(boolean mostrarTodos, String busca, Long categoriaId, String ordenacao) {
        var empresaId = sessao.empresaObrigatoria();
        var lista = new ArrayList<>(mostrarTodos ? servicos.findByEmpresaIdOrderByAtivoDescNomeAsc(empresaId)
                : servicos.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId));
        var termo = busca == null ? "" : busca.trim();
        if (!termo.isEmpty()) {
            var termoLower = termo.toLowerCase(Locale.ROOT);
            lista.removeIf(s -> s.getNome() == null || !s.getNome().toLowerCase(Locale.ROOT).contains(termoLower));
        }
        if (categoriaId != null) {
            lista.removeIf(s -> s.getCategoriaServico() == null
                    || !categoriaId.equals(s.getCategoriaServico().getId()));
        }
        var ordem = ordenacao == null || ordenacao.isBlank() ? "nome" : ordenacao;
        Comparator<Servico> comparator = switch (ordem) {
            case "preco_asc" -> Comparator.comparing(Servico::getPreco, Comparator.nullsLast(Comparator.naturalOrder()));
            case "preco_desc" ->
                Comparator.comparing(Servico::getPreco, Comparator.nullsLast(Comparator.reverseOrder()));
            default -> Comparator.comparing(s -> s.getNome() == null ? "" : s.getNome(), String.CASE_INSENSITIVE_ORDER);
        };
        lista.sort(comparator);
        return lista;
    }

    @Transactional(readOnly = true)
    public List<CategoriaServico> categoriasParaFormulario(Long categoriaAtualId) {
        var empresaId = sessao.empresaObrigatoria();
        var disponiveis = new ArrayList<>(categorias.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId));
        if (categoriaAtualId != null && disponiveis.stream().noneMatch(c -> c.getId().equals(categoriaAtualId))) {
            categorias.findByIdAndEmpresaId(categoriaAtualId, empresaId).ifPresent(disponiveis::add);
        }
        return disponiveis;
    }

    @Transactional(readOnly = true)
    public List<CategoriaServico> listarCategorias(boolean mostrarTodas) {
        var empresaId = sessao.empresaObrigatoria();
        return mostrarTodas ? categorias.findByEmpresaIdOrderByAtivoDescNomeAsc(empresaId)
                : categorias.findByEmpresaIdAndAtivoTrueOrderByNome(empresaId);
    }

    public CategoriaServico criarCategoria(String nome) {
        var nomeNormalizado = nome == null ? "" : nome.trim();
        if (nomeNormalizado.isEmpty()) {
            throw new IllegalArgumentException("Nome da categoria é obrigatório.");
        }
        if (nomeNormalizado.length() > 100) {
            throw new IllegalArgumentException("O nome da categoria deve ter no máximo 100 caracteres.");
        }
        var empresaId = sessao.empresaObrigatoria();
        if (categorias.existsByEmpresaIdAndNomeIgnoreCase(empresaId, nomeNormalizado)) {
            throw new IllegalArgumentException("Já existe uma categoria de serviço com este nome.");
        }
        var categoria = new CategoriaServico();
        categoria.setEmpresaId(empresaId);
        categoria.setNome(nomeNormalizado);
        categoria.setAtivo(true);
        return categorias.save(categoria);
    }

    @Transactional(readOnly = true)
    public ServicoDTO obter(Long id) {
        var servico = buscar(id);
        return new ServicoDTO(servico.getId(), servico.getNome(), servico.getDescricao(), servico.getPreco(),
                servico.getTempoEstimadoMinutos(), servico.getCategoriaServico().getId(), servico.getAtivo());
    }

    public Servico salvar(ServicoDTO dados) {
        var empresaId = sessao.empresaObrigatoria();
        var servico = dados.id() == null ? new Servico() : buscar(dados.id());
        var categoria = categorias.findByIdAndEmpresaIdAndAtivoTrue(dados.categoriaServicoId(), empresaId)
                .orElseGet(() -> {
                    if (dados.id() != null && servico.getCategoriaServico().getId().equals(dados.categoriaServicoId())) {
                        return servico.getCategoriaServico();
                    }
                    throw new RecursoNaoEncontradoException("Categoria de serviço não encontrada ou inativa.");
                });
        servico.setEmpresaId(empresaId);
        servico.setNome(dados.nome().trim());
        servico.setDescricao(normalizarOpcional(dados.descricao()));
        servico.setPreco(dados.preco());
        servico.setTempoEstimadoMinutos(dados.tempoEstimadoMinutos());
        servico.setCategoriaServico(categoria);
        if (dados.id() == null) {
            servico.setAtivo(true);
        }
        return servicos.save(servico);
    }

    public void inativar(Long id) {
        buscar(id).setAtivo(false);
    }

    public void reativar(Long id) {
        buscar(id).setAtivo(true);
    }

    public void inativarCategoria(Long id) {
        buscarCategoria(id).setAtivo(false);
    }

    public void reativarCategoria(Long id) {
        buscarCategoria(id).setAtivo(true);
    }

    private Servico buscar(Long id) {
        return servicos.findByIdAndEmpresaId(id, sessao.empresaObrigatoria())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado."));
    }

    private CategoriaServico buscarCategoria(Long id) {
        return categorias.findByIdAndEmpresaId(id, sessao.empresaObrigatoria())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria de serviço não encontrada."));
    }

    private String normalizarOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
