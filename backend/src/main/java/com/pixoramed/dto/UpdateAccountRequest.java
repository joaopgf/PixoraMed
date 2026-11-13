// Dados de entrada da edição da conta (PUT /api/users/me): nome e e-mail. A senha tem rota própria.
package com.pixoramed.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAccountRequest(
        @NotBlank(message = AccountRules.NAME_MESSAGE)
        @Size(min = AccountRules.NAME_MIN, max = AccountRules.NAME_MAX, message = AccountRules.NAME_MESSAGE)
        String name,

        @NotBlank(message = AccountRules.EMAIL_MESSAGE)
        @Email(message = AccountRules.EMAIL_MESSAGE)
        @Size(min = AccountRules.EMAIL_MIN, max = AccountRules.EMAIL_MAX, message = AccountRules.EMAIL_MESSAGE)
        String email) {

    public UpdateAccountRequest {
        name = AccountRules.normalizeName(name);
        email = AccountRules.normalizeEmail(email);
    }
}
