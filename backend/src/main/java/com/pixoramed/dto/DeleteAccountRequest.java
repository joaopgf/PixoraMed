// Dados de entrada da exclusão da conta (DELETE /api/users/me): a senha, para confirmar que é o dono.
package com.pixoramed.dto;

import jakarta.validation.constraints.NotBlank;

public record DeleteAccountRequest(
        @NotBlank(message = "Informe a senha para excluir a conta.")
        String password) {
}
