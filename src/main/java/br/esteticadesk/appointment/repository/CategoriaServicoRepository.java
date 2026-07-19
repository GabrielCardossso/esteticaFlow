package br.esteticadesk.appointment.repository;

import br.esteticadesk.appointment.entity.CategoriaServico;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoriaServicoRepository extends JpaRepository<CategoriaServico, Long> {
    List<CategoriaServico> findByEmpresaIdAndAtivoTrueOrderByNome(Long empresaId);

    List<CategoriaServico> findByEmpresaIdOrderByAtivoDescNomeAsc(Long empresaId);

    Optional<CategoriaServico> findByIdAndEmpresaIdAndAtivoTrue(Long id, Long empresaId);

    Optional<CategoriaServico> findByIdAndEmpresaId(Long id, Long empresaId);

    boolean existsByEmpresaIdAndNomeIgnoreCase(Long empresaId, String nome);
}
