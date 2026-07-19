package br.esteticadesk.company.repository;

import br.esteticadesk.company.entity.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> {
    Optional<Empresa> findByCnpj(String cnpj);

    @Query("""
            SELECT (COUNT(e) > 0) FROM Empresa e
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(e.cnpj, '.', ''), '-', ''), '/', ''), ' ', '') = :cnpj
            AND (:id IS NULL OR e.id <> :id)
            """)
    boolean existeCnpjNormalizado(@Param("cnpj") String cnpj, @Param("id") Long id);

    List<Empresa> findAllByOrderByNomeFantasiaAsc();

    List<Empresa> findByAtivoTrueOrderByNomeFantasiaAsc();

    Optional<Empresa> findByIdAndAtivoTrue(Long id);
}
