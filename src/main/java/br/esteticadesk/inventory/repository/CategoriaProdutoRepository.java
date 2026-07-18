package br.esteticadesk.inventory.repository;

import br.esteticadesk.inventory.entity.CategoriaProduto;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoriaProdutoRepository extends JpaRepository<CategoriaProduto, Long> {
    List<CategoriaProduto> findByEmpresaIdAndAtivoTrueOrderByNome(Long empresaId);
}
