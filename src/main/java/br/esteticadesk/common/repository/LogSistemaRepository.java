package br.esteticadesk.common.repository;

import br.esteticadesk.common.entity.LogSistema;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LogSistemaRepository extends JpaRepository<LogSistema, Long> {

    @Query("""
            SELECT l FROM LogSistema l
            LEFT JOIN FETCH l.usuario
            WHERE l.empresaId = :empresaId
              AND l.detalhes LIKE :detalhe
            ORDER BY l.dataHora DESC
            """)
    List<LogSistema> findByEmpresaIdAndDetalhesLikeOrderByDataHoraDesc(
            @Param("empresaId") Long empresaId,
            @Param("detalhe") String detalhe);

    List<LogSistema> findTop200ByOrderByDataHoraDesc();

    List<LogSistema> findTop200ByEmpresaIdOrderByDataHoraDesc(Long empresaId);
}
