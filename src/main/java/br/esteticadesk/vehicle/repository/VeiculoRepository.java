package br.esteticadesk.vehicle.repository;

import br.esteticadesk.vehicle.entity.Veiculo;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VeiculoRepository extends JpaRepository<Veiculo, Long> {
    @Query("""
            SELECT (COUNT(v) > 0) FROM Veiculo v
            WHERE v.empresaId = :empresaId
            AND UPPER(REPLACE(v.placa, '-', '')) = :placa
            AND (:id IS NULL OR v.id <> :id)
            """)
    boolean existePlacaNormalizada(@Param("empresaId") Long empresaId, @Param("placa") String placa,
            @Param("id") Long id);

    @Query("""
            SELECT v FROM Veiculo v
            JOIN FETCH v.cliente
            WHERE v.id = :id AND v.empresaId = :empresaId
            """)
    Optional<Veiculo> findByIdAndEmpresaId(@Param("id") Long id, @Param("empresaId") Long empresaId);

    List<Veiculo> findByEmpresaIdAndClienteIdAndAtivoTrueOrderByModelo(Long empresaId, Long clienteId);

    List<Veiculo> findByEmpresaIdAndClienteIdOrderByAtivoDescModelo(Long empresaId, Long clienteId);

    List<Veiculo> findByEmpresaIdAndAtivoTrueOrderByModelo(Long empresaId);
}
