// Dados de entrada do cadastro (POST /api/auth/register). As mensagens aparecem na tela.
package com.pixoramed.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = AccountRules.NAME_MESSAGE)
        @Size(min = AccountRules.NAME_MIN, max = AccountRules.NAME_MAX, message = AccountRules.NAME_MESSAGE)
        String name,

        @NotBlank(message = AccountRules.EMAIL_MESSAGE)
        @Email(message = AccountRules.EMAIL_MESSAGE)
        @Size(min = AccountRules.EMAIL_MIN, max = AccountRules.EMAIL_MAX, message = AccountRules.EMAIL_MESSAGE)
        String email,

        @NotBlank(message = "A senha" + AccountRules.PASSWORD_MIN_MESSAGE)
        @Size(min = AccountRules.PASSWORD_MIN, message = "A senha" + AccountRules.PASSWORD_MIN_MESSAGE)
        String password) {

    // Normaliza antes da validação: o @Size conta o nome sem espaços sobrando
    public RegisterRequest {
        name = AccountRules.normalizeName(name);
        email = AccountRules.normalizeEmail(email);
    }

    // O Bean Validation trata o método "is..." como campo; o @JsonIgnore impede que ele vá para o JSON
    @JsonIgnore
    @AssertTrue(message = "A senha" + AccountRules.PASSWORD_BYTES_MESSAGE)
    public boolean isPasswordWithinBcryptLimit() {
        return AccountRules.fitsBcrypt(password);
    }
}
