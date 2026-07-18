package br.esteticadesk.enums;

public enum PapelUsuario {
    SUPER_ADMIN,
    ADMINISTRADOR,
    FUNCIONARIO;

    public boolean isAdminEmpresa() {
        return this == SUPER_ADMIN || this == ADMINISTRADOR;
    }

    public boolean isSuperAdmin() {
        return this == SUPER_ADMIN;
    }
}
