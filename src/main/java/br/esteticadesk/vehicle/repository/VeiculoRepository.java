package br.esteticadesk.vehicle.repository;

import br.esteticadesk.vehicle.entity.Veiculo;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VeiculoRepository extends JpaRepository<Veiculo, Long> {
    boolean existsByEmpresaIdAndPlacaAndAtivoTrue(Long empresaId, String placa);

    Optional<Veiculo> findByIdAndEmpresaId(Long id, Long empresaId);
}
