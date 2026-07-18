package br.esteticadesk.customer.entity;

import br.esteticadesk.common.EntidadeEmpresaBase;
import br.esteticadesk.vehicle.entity.Veiculo;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "cliente")
@Getter
@Setter
public class Cliente extends EntidadeEmpresaBase {
    @NotBlank
    @Size(max = 150)
    @Column(nullable = false)
    private String nome;
    @Size(max = 18)
    @Column(name = "cpf_cnpj")
    private String cpfCnpj;
    @NotBlank
    @Size(max = 20)
    @Column(nullable = false)
    private String telefone;
    @Email
    @Size(max = 150)
    private String email;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
    @OneToMany(mappedBy = "cliente", fetch = FetchType.LAZY)
    private List<Veiculo> veiculos = new ArrayList<>();
}
