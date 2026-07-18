package br.esteticadesk.employee.repository;

import br.esteticadesk.employee.entity.Funcionario;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FuncionarioRepository extends JpaRepository<Funcionario, Long> {
    Optional<Funcionario> findByIdAndEmpresaId(Long id, Long empresaId);

    @Query("""
            SELECT f FROM Funcionario f
            JOIN FETCH f.usuario u
            WHERE f.empresaId = :empresaId AND f.ativo = true
            ORDER BY u.nome
            """)
    List<Funcionario> findByEmpresaIdAndAtivoTrueOrderById(@Param("empresaId") Long empresaId);
}
