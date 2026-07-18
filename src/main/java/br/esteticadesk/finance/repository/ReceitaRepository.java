package br.esteticadesk.finance.repository;

import br.esteticadesk.finance.entity.Receita;
import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

public interface ReceitaRepository extends JpaRepository<Receita, Long> {
    @EntityGraph(attributePaths = "formaPagamento")
    List<Receita> findByEmpresaIdAndDataRecebimentoBetween(Long empresaId, LocalDate inicio, LocalDate fim);

    List<Receita> findByEmpresaIdOrderByDataRecebimentoDesc(Long empresaId);
}
