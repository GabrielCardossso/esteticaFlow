package br.esteticadesk.company.repository;

import br.esteticadesk.company.entity.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> {
    Optional<Empresa> findByCnpj(String cnpj);

    List<Empresa> findAllByOrderByNomeFantasiaAsc();
}
