package br.esteticadesk.finance.repository;

import br.esteticadesk.finance.entity.Despesa;
import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DespesaRepository extends JpaRepository<Despesa, Long> {
    List<Despesa> findByEmpresaIdAndDataPagamentoBetween(Long empresaId, LocalDate inicio, LocalDate fim);

    List<Despesa> findByEmpresaIdOrderByDataPagamentoDesc(Long empresaId);
}
