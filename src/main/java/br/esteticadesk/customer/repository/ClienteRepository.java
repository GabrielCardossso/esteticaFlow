package br.esteticadesk.customer.repository;

import br.esteticadesk.customer.entity.Cliente;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    @Query("""
            SELECT (COUNT(c) > 0) FROM Cliente c
            WHERE c.empresaId = :empresaId
            AND REPLACE(REPLACE(REPLACE(c.cpfCnpj, '.', ''), '-', ''), '/', '') = :cpfCnpj
            AND (:id IS NULL OR c.id <> :id)
            """)
    boolean existeCpfCnpjNormalizado(@Param("empresaId") Long empresaId, @Param("cpfCnpj") String cpfCnpj,
            @Param("id") Long id);

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
                c.cpfCnpj LIKE CONCAT('%', :busca, '%') OR
                (:buscaNumerica <> '' AND (
                    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.telefone, '(', ''), ')', ''), ' ', ''), '-', ''), '.', '')
                        LIKE CONCAT('%', :buscaNumerica, '%') OR
                    REPLACE(REPLACE(REPLACE(REPLACE(c.cpfCnpj, '.', ''), '-', ''), '/', ''), ' ', '')
                        LIKE CONCAT('%', :buscaNumerica, '%')
                ))
            )
            ORDER BY c.nome
            """)
    List<Cliente> buscar(@Param("empresaId") Long empresaId, @Param("busca") String busca,
            @Param("buscaNumerica") String buscaNumerica, @Param("ativo") Boolean ativo);
}
