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
    @Size(max = 9)
    @Column(length = 9)
    private String cep;
    @Size(max = 150)
    @Column(length = 150)
    private String logradouro;
    @Size(max = 20)
    @Column(length = 20)
    private String numero;
    @Size(max = 100)
    @Column(length = 100)
    private String complemento;
    @Size(max = 100)
    @Column(length = 100)
    private String bairro;
    @Size(max = 100)
    @Column(length = 100)
    private String cidade;
    @Size(max = 2)
    @Column(length = 2)
    private String uf;
    @NotNull
    @Column(nullable = false)
    private Boolean ativo = true;
    @OneToMany(mappedBy = "cliente", fetch = FetchType.LAZY)
    private List<Veiculo> veiculos = new ArrayList<>();
}
