// Dados de entrada do login (POST /api/auth/login).
package com.pixoramed.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Informe um e-mail válido.") String email,
        @NotBlank(message = "Informe a senha.") String password) {
}
