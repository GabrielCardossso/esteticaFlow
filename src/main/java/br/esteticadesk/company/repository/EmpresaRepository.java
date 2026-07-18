package br.esteticadesk.company.repository;

import br.esteticadesk.company.entity.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> { }
