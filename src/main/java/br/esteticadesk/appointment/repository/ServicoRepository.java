package br.esteticadesk.appointment.repository;

import br.esteticadesk.appointment.entity.Servico;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServicoRepository extends JpaRepository<Servico, Long> {
    List<Servico> findByEmpresaIdAndAtivoTrueOrderByNome(Long empresaId);

    List<Servico> findByEmpresaIdOrderByAtivoDescNomeAsc(Long empresaId);

    Optional<Servico> findByIdAndEmpresaId(Long id, Long empresaId);

    Optional<Servico> findByIdAndEmpresaIdAndAtivoTrue(Long id, Long empresaId);
}
