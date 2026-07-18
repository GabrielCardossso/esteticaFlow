package br.esteticadesk.customer.repository;

import br.esteticadesk.customer.entity.Cliente;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    boolean existsByEmpresaIdAndCpfCnpjAndAtivoTrue(Long empresaId, String cpfCnpj);

    Optional<Cliente> findByIdAndEmpresaId(Long id, Long empresaId);

    List<Cliente> findByEmpresaIdAndAtivoTrueOrderByNome(Long empresaId);

    List<Cliente> findByEmpresaIdOrderByNome(Long empresaId);

    @Query("""
            SELECT DISTINCT c FROM Cliente c LEFT JOIN FETCH c.veiculos
            WHERE c.empresaId = :empresaId
            AND (:ativo IS NULL OR c.ativo = :ativo)
            AND (
                :busca IS NULL OR :busca = '' OR
                LOWER(c.nome) LIKE LOWER(CONCAT('%', :busca, '%')) OR
                c.telefone LIKE CONCAT('%', :busca, '%') OR
                c.cpfCnpj LIKE CONCAT('%', :busca, '%')
            )
            ORDER BY c.nome
            """)
    List<Cliente> buscar(@Param("empresaId") Long empresaId, @Param("busca") String busca,
            @Param("ativo") Boolean ativo);
}
