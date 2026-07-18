package br.esteticadesk.company.repository;

import br.esteticadesk.company.entity.Configuracao;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfiguracaoRepository extends JpaRepository<Configuracao, Long> {
    Optional<Configuracao> findByEmpresaIdAndChave(Long empresaId, String chave);
    List<Configuracao> findByEmpresaId(Long empresaId);
}
