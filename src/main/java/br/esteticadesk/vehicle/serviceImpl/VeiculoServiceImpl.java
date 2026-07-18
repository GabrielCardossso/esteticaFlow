package br.esteticadesk.vehicle.serviceImpl;

import br.esteticadesk.auth.SessaoUsuario;
import br.esteticadesk.customer.repository.ClienteRepository;
import br.esteticadesk.exception.*;
import br.esteticadesk.validation.DocumentoValidator;
import br.esteticadesk.vehicle.entity.Veiculo;
import br.esteticadesk.vehicle.repository.VeiculoRepository;
import br.esteticadesk.vehicle.service.VeiculoService;
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
        if (!DocumentoValidator.placaValida(veiculo.getPlaca()))
            throw new IllegalArgumentException("Placa inválida.");
        if (veiculos.existsByEmpresaIdAndPlacaAndAtivoTrue(empresaId, veiculo.getPlaca()))
            throw new PlacaJaCadastradaException();
        var cliente = clientes.findByIdAndEmpresaId(clienteId, empresaId).filter(c -> Boolean.TRUE.equals(c.getAtivo()))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente ativo não encontrado."));
        veiculo.setEmpresaId(empresaId);
        veiculo.setCliente(cliente);
        if (veiculo.getAtivo() == null)
            veiculo.setAtivo(true);
        return veiculos.save(veiculo);
    }
}
