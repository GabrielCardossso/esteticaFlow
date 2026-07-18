package br.esteticadesk.vehicle.serviceImpl;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.customer.repository.ClienteRepository;
import br.esteticadesk.exception.*;
import br.esteticadesk.validation.DocumentoValidator;
import br.esteticadesk.vehicle.entity.Veiculo;
import br.esteticadesk.vehicle.repository.VeiculoRepository;
import br.esteticadesk.vehicle.service.VeiculoService;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class VeiculoServiceImpl implements VeiculoService {
    private final VeiculoRepository veiculos;
    private final ClienteRepository clientes;
    private final SessaoUsuario sessao;

    public VeiculoServiceImpl(VeiculoRepository veiculos, ClienteRepository clientes, SessaoUsuario sessao) {
        this.veiculos = veiculos;
        this.clientes = clientes;
        this.sessao = sessao;
    }

    public Veiculo salvar(Veiculo veiculo, Long clienteId) {
        var empresaId = sessao.empresaObrigatoria();
        var placa = normalizarPlaca(veiculo.getPlaca());
        if (!DocumentoValidator.placaValida(placa))
            throw new IllegalArgumentException("Placa inválida.");
        if (veiculos.existePlacaNormalizada(empresaId, placa, veiculo.getId()))
            throw new PlacaJaCadastradaException();
        var cliente = clientes.findByIdAndEmpresaId(clienteId, empresaId).filter(c -> Boolean.TRUE.equals(c.getAtivo()))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente ativo não encontrado."));
        if (veiculo.getId() == null) {
            veiculo.setEmpresaId(empresaId);
            veiculo.setCliente(cliente);
            veiculo.setAtivo(true);
            normalizar(veiculo, placa);
            return veiculos.save(veiculo);
        }
        var existente = buscarEntidade(veiculo.getId(), clienteId, empresaId);
        existente.setPlaca(placa);
        existente.setModelo(veiculo.getModelo());
        existente.setMarca(veiculo.getMarca());
        existente.setCor(veiculo.getCor());
        existente.setAno(veiculo.getAno());
        normalizar(existente, placa);
        return veiculos.save(existente);
    }

    @Override
    @Transactional(readOnly = true)
    public Veiculo buscarPorId(Long id, Long clienteId) {
        return buscarEntidade(id, clienteId, sessao.empresaObrigatoria());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Veiculo> listarPorCliente(Long clienteId) {
        var empresaId = sessao.empresaObrigatoria();
        clientes.findByIdAndEmpresaId(clienteId, empresaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente não encontrado."));
        return veiculos.findByEmpresaIdAndClienteIdOrderByAtivoDescModelo(empresaId, clienteId);
    }

    @Override
    public Veiculo inativar(Long id, Long clienteId) {
        var veiculo = buscarEntidade(id, clienteId, sessao.empresaObrigatoria());
        veiculo.setAtivo(false);
        return veiculos.save(veiculo);
    }

    private Veiculo buscarEntidade(Long id, Long clienteId, Long empresaId) {
        return veiculos.findByIdAndEmpresaId(id, empresaId)
                .filter(veiculo -> Boolean.TRUE.equals(veiculo.getAtivo()))
                .filter(veiculo -> veiculo.getCliente().getId().equals(clienteId))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Veículo não encontrado."));
    }

    private void normalizar(Veiculo veiculo, String placa) {
        veiculo.setPlaca(placa);
        veiculo.setModelo(textoObrigatorio(veiculo.getModelo(), "Modelo é obrigatório."));
        veiculo.setMarca(textoObrigatorio(veiculo.getMarca(), "Marca é obrigatória."));
        veiculo.setCor(textoOpcional(veiculo.getCor()));
    }

    private String normalizarPlaca(String valor) {
        if (valor == null)
            return null;
        return valor.replace("-", "").replace(" ", "").toUpperCase(Locale.ROOT);
    }

    private String textoObrigatorio(String valor, String mensagem) {
        if (valor == null || valor.isBlank())
            throw new IllegalArgumentException(mensagem);
        return valor.trim();
    }

    private String textoOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
