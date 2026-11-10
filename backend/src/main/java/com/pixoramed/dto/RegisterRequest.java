// Dados de entrada do cadastro (POST /api/auth/register). As mensagens aparecem na tela.
package com.pixoramed.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Informe o nome, com pelo menos 2 letras.")
        @Size(min = 2, max = 80, message = "Informe o nome, com pelo menos 2 letras.")
        String name,

        @NotBlank(message = "Informe um e-mail válido.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 254, message = "Informe um e-mail válido.")
        String email,

        @NotBlank(message = "A senha precisa ter de 8 a 128 caracteres.")
        @Size(min = 8, max = 128, message = "A senha precisa ter de 8 a 128 caracteres.")
        String password) {
}
