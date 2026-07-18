package br.esteticadesk.appointment.repository;

import br.esteticadesk.appointment.entity.Agendamento;
import br.esteticadesk.enums.StatusAgendamento;
import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {
    Optional<Agendamento> findByIdAndEmpresaId(Long id, Long empresaId);

    List<Agendamento> findByEmpresaId(Long empresaId);

    List<Agendamento> findByEmpresaIdAndFuncionarioIdAndStatusInAndDataHoraBetween(Long empresaId, Long funcionarioId,
            Collection<StatusAgendamento> status, LocalDateTime inicio, LocalDateTime fim);

    List<Agendamento> findByEmpresaIdAndStatusAndDataHoraBetween(Long empresaId, StatusAgendamento status,
            LocalDateTime inicio, LocalDateTime fim);

    List<Agendamento> findByEmpresaIdAndDataHoraBetweenOrderByDataHoraAsc(Long empresaId, LocalDateTime inicio,
            LocalDateTime fim);
}
