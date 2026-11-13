// Dados de entrada da troca de senha (PATCH /api/users/me/password): a senha atual e a nova.
package com.pixoramed.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Informe a senha atual.")
        String currentPassword,

        @NotBlank(message = "A nova senha" + AccountRules.PASSWORD_MIN_MESSAGE)
        @Size(min = AccountRules.PASSWORD_MIN, message = "A nova senha" + AccountRules.PASSWORD_MIN_MESSAGE)
        String newPassword) {

    @JsonIgnore
    @AssertTrue(message = "A nova senha" + AccountRules.PASSWORD_BYTES_MESSAGE)
    public boolean isNewPasswordWithinBcryptLimit() {
        return AccountRules.fitsBcrypt(newPassword);
    }
}
