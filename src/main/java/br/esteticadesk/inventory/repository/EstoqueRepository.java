package br.esteticadesk.inventory.repository;

import br.esteticadesk.inventory.entity.Estoque;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EstoqueRepository extends JpaRepository<Estoque, Long> {
    Optional<Estoque> findByEmpresaIdAndProdutoId(Long empresaId, Long produtoId);

    @Query("""
            SELECT e FROM Estoque e
            JOIN FETCH e.produto
            WHERE e.empresaId = :empresaId
            ORDER BY e.produto.nome
            """)
    List<Estoque> findByEmpresaId(@Param("empresaId") Long empresaId);
}
