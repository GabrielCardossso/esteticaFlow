package br.esteticadesk.common.service;

import br.esteticadesk.common.entity.LogSistema;
import br.esteticadesk.common.repository.LogSistemaRepository;
import br.esteticadesk.employee.entity.Usuario;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class LogService {
    private final LogSistemaRepository repository;

    public LogService(LogSistemaRepository repository) {
        this.repository = repository;
    }

    public void registrar(Long empresaId, Usuario usuario, String acao, String detalhes) {
        var log = new LogSistema();
        log.setEmpresaId(empresaId);
        log.setUsuario(usuario);
        log.setAcao(acao);
        log.setDetalhes(detalhes);
        repository.save(log);
    }
}
