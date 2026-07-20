package br.esteticadesk.appointment.repository;

import br.esteticadesk.appointment.entity.Agendamento;
import br.esteticadesk.enums.StatusAgendamento;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {
    Optional<Agendamento> findByIdAndEmpresaId(Long id, Long empresaId);

    List<Agendamento> findByEmpresaId(Long empresaId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Agendamento a WHERE a.id = :id AND a.empresaId = :empresaId")
    Optional<Agendamento> findByIdAndEmpresaIdForUpdate(@Param("id") Long id, @Param("empresaId") Long empresaId);

    List<Agendamento> findByEmpresaIdAndFuncionarioIdAndStatusInAndDataHoraBetween(Long empresaId, Long funcionarioId,
            Collection<StatusAgendamento> status, LocalDateTime inicio, LocalDateTime fim);

    List<Agendamento> findByEmpresaIdAndStatusAndDataHoraBetween(Long empresaId, StatusAgendamento status,
            LocalDateTime inicio, LocalDateTime fim);

    @Query("""
            SELECT DISTINCT a FROM Agendamento a
            JOIN FETCH a.cliente
            JOIN FETCH a.veiculo
            LEFT JOIN FETCH a.servicos linhas
            LEFT JOIN FETCH linhas.servico
            WHERE a.empresaId = :empresaId
              AND a.dataHora BETWEEN :inicio AND :fim
            ORDER BY a.dataHora ASC
            """)
    List<Agendamento> findByEmpresaIdAndDataHoraBetweenOrderByDataHoraAsc(
            @Param("empresaId") Long empresaId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim);

    @Query("""
            SELECT a.cliente.id, MAX(a.dataHora)
            FROM Agendamento a
            WHERE a.empresaId = :empresaId
              AND a.status = :status
              AND a.cliente.id IN :clienteIds
            GROUP BY a.cliente.id
            """)
    List<Object[]> findUltimosAtendimentosPorClientes(
            @Param("empresaId") Long empresaId,
            @Param("clienteIds") Collection<Long> clienteIds,
            @Param("status") StatusAgendamento status);

    @Query("""
            SELECT MAX(a.dataHora)
            FROM Agendamento a
            WHERE a.empresaId = :empresaId
              AND a.cliente.id = :clienteId
              AND a.status = :status
            """)
    Optional<LocalDateTime> findUltimoAtendimento(
            @Param("empresaId") Long empresaId,
            @Param("clienteId") Long clienteId,
            @Param("status") StatusAgendamento status);

    @Query("""
            SELECT COUNT(a)
            FROM Agendamento a
            WHERE a.empresaId = :empresaId
              AND a.cliente.id = :clienteId
              AND a.status = :status
            """)
    long countByClienteAndStatus(
            @Param("empresaId") Long empresaId,
            @Param("clienteId") Long clienteId,
            @Param("status") StatusAgendamento status);

    @Query("""
            SELECT COALESCE(SUM(a.total), 0)
            FROM Agendamento a
            WHERE a.empresaId = :empresaId
              AND a.cliente.id = :clienteId
              AND a.status = :status
            """)
    BigDecimal sumTotalByClienteAndStatus(
            @Param("empresaId") Long empresaId,
            @Param("clienteId") Long clienteId,
            @Param("status") StatusAgendamento status);
}
