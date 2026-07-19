package br.esteticadesk.employee.repository;

import br.esteticadesk.employee.entity.Usuario;
import br.esteticadesk.enums.PapelUsuario;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    List<Usuario> findByEmpresaIdOrderByNome(Long empresaId);
    List<Usuario> findByEmpresaIdAndAtivoTrueOrderByNome(Long empresaId);
    Optional<Usuario> findByIdAndEmpresaId(Long id, Long empresaId);
    long countByEmpresaIdAndAtivoTrueAndPapelNot(Long empresaId, PapelUsuario papel);
}
