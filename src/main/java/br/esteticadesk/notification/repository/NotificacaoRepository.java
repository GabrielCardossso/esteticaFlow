package br.esteticadesk.notification.repository;

import br.esteticadesk.enums.TipoNotificacao;
import br.esteticadesk.notification.entity.Notificacao;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {

    List<Notificacao> findTop100ByEmpresaIdOrderByDataCriacaoDesc(Long empresaId);

    List<Notificacao> findTop100ByEmpresaIdIsNullOrderByDataCriacaoDesc();

    long countByEmpresaIdAndLidaFalse(Long empresaId);

    long countByEmpresaIdIsNullAndLidaFalse();

    boolean existsByEmpresaIdAndTipoAndReferenciaTipoAndReferenciaIdAndLidaFalse(
            Long empresaId, TipoNotificacao tipo, String referenciaTipo, Long referenciaId);

    boolean existsByEmpresaIdIsNullAndTipoAndReferenciaTipoAndReferenciaIdAndLidaFalse(
            TipoNotificacao tipo, String referenciaTipo, Long referenciaId);

    @Query("""
            SELECT n FROM Notificacao n
            WHERE n.id = :id
              AND ((:empresaId IS NULL AND n.empresaId IS NULL) OR n.empresaId = :empresaId)
            """)
    java.util.Optional<Notificacao> findByIdAndEscopo(@Param("id") Long id, @Param("empresaId") Long empresaId);
}
