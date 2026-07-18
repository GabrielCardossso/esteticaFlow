package br.esteticadesk.finance.repository;

import br.esteticadesk.finance.entity.FormaPagamento;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FormaPagamentoRepository extends JpaRepository<FormaPagamento, Long> {
    Optional<FormaPagamento> findByIdAndEmpresaIdAndAtivoTrue(Long id, Long empresaId);
}
