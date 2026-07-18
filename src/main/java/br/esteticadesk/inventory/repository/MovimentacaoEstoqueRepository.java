package br.esteticadesk.inventory.repository;

import br.esteticadesk.inventory.entity.MovimentacaoEstoque;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovimentacaoEstoqueRepository extends JpaRepository<MovimentacaoEstoque, Long> {
    @EntityGraph(attributePaths = "produto")
    List<MovimentacaoEstoque> findTop20ByEmpresaIdOrderByDataMovimentacaoDesc(Long empresaId);
}
