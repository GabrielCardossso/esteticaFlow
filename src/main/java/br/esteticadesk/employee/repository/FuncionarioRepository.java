package br.esteticadesk.employee.repository;

import br.esteticadesk.employee.entity.Funcionario;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FuncionarioRepository extends JpaRepository<Funcionario, Long> {
    Optional<Funcionario> findByIdAndEmpresaId(Long id, Long empresaId);
}
