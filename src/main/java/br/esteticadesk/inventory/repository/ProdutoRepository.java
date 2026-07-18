package br.esteticadesk.inventory.repository;

import br.esteticadesk.inventory.entity.Produto;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {
    Optional<Produto> findByIdAndEmpresaId(Long id, Long empresaId);
}
