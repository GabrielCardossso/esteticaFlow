package br.esteticadesk.auth.repository;

import br.esteticadesk.auth.entity.HistoricoAcesso;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistoricoAcessoRepository extends JpaRepository<HistoricoAcesso, Long> {

    Optional<HistoricoAcesso> findFirstByUsuarioIdOrderByDataHoraDesc(Long usuarioId);

    List<HistoricoAcesso> findTop10ByEmpresaIdOrderByDataHoraDesc(Long empresaId);
}
