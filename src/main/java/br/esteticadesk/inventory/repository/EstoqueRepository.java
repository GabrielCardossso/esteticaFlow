package br.esteticadesk.inventory.repository;

import br.esteticadesk.inventory.entity.Estoque;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstoqueRepository extends JpaRepository<Estoque, Long> {
    Optional<Estoque> findByEmpresaIdAndProdutoId(Long empresaId, Long produtoId);

    List<Estoque> findByEmpresaId(Long empresaId);
}
