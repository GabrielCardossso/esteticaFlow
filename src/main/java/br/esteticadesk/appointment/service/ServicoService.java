package br.esteticadesk.appointment.service;

import br.esteticadesk.appointment.dto.ServicoDTO;
import br.esteticadesk.appointment.entity.CategoriaServico;
import br.esteticadesk.appointment.entity.Servico;
import br.esteticadesk.appointment.repository.CategoriaServicoRepository;
import br.esteticadesk.appointment.repository.ServicoRepository;
import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.exception.RecursoNaoEncontradoException;
import java.util.List;
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
    public List<Servico> listar() {
        return servicos.findByEmpresaIdOrderByAtivoDescNomeAsc(sessao.empresaObrigatoria());
    }

    @Transactional(readOnly = true)
    public List<CategoriaServico> categoriasAtivas() {
        return categorias.findByEmpresaIdAndAtivoTrueOrderByNome(sessao.empresaObrigatoria());
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
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria de serviço não encontrada."));
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

    private Servico buscar(Long id) {
        return servicos.findByIdAndEmpresaId(id, sessao.empresaObrigatoria())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado."));
    }

    private String normalizarOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
