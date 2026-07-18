package br.esteticadesk.inventory.repository;

import br.esteticadesk.inventory.entity.CategoriaProduto;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoriaProdutoRepository extends JpaRepository<CategoriaProduto, Long> {
    List<CategoriaProduto> findByEmpresaIdAndAtivoTrueOrderByNome(Long empresaId);

    boolean existsByEmpresaIdAndNomeIgnoreCase(Long empresaId, String nome);

    Optional<CategoriaProduto> findByIdAndEmpresaIdAndAtivoTrue(Long id, Long empresaId);
}
