package br.esteticadesk.company.repository;

import br.esteticadesk.company.entity.SolicitacaoAlteracaoEmpresa;
import br.esteticadesk.enums.StatusSolicitacao;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SolicitacaoAlteracaoEmpresaRepository extends JpaRepository<SolicitacaoAlteracaoEmpresa, Long> {

    Optional<SolicitacaoAlteracaoEmpresa> findByEmpresaIdAndStatus(Long empresaId, StatusSolicitacao status);

    List<SolicitacaoAlteracaoEmpresa> findByStatusOrderByDataCriacaoDesc(StatusSolicitacao status);

    List<SolicitacaoAlteracaoEmpresa> findTop20ByEmpresaIdOrderByDataCriacaoDesc(Long empresaId);

    Optional<SolicitacaoAlteracaoEmpresa> findByIdAndEmpresaId(Long id, Long empresaId);
}
