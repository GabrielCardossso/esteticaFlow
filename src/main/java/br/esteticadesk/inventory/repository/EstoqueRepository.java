package br.esteticadesk.inventory.repository;

import br.esteticadesk.inventory.entity.Estoque;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EstoqueRepository extends JpaRepository<Estoque, Long> {
    Optional<Estoque> findByEmpresaIdAndProdutoId(Long empresaId, Long produtoId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT e FROM Estoque e
            JOIN FETCH e.produto
            WHERE e.empresaId = :empresaId AND e.produto.id = :produtoId
            """)
    Optional<Estoque> findByEmpresaIdAndProdutoIdForUpdate(@Param("empresaId") Long empresaId,
            @Param("produtoId") Long produtoId);

    @Query("""
            SELECT e FROM Estoque e
            JOIN FETCH e.produto
            WHERE e.empresaId = :empresaId
            ORDER BY e.produto.nome
            """)
    List<Estoque> findByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("""
            SELECT e FROM Estoque e
            JOIN FETCH e.produto
            WHERE e.empresaId = :empresaId AND e.produto.ativo = true
            ORDER BY e.produto.nome
            """)
    List<Estoque> findByEmpresaIdAndProdutoAtivoTrue(@Param("empresaId") Long empresaId);
}
