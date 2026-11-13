// Testes das regras da conta: tamanhos do nome e do e-mail, formato do e-mail e limite de 72 bytes da senha.
package com.pixoramed.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

class AccountRulesTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private int errors(Object request) {
        return validator.validate(request).size();
    }

    @Test
    void nameUpTo255CharactersIsAccepted() {
        assertEquals(0, errors(new UpdateAccountRequest("a".repeat(255), "joao@example.com")));
        assertEquals(1, errors(new UpdateAccountRequest("a".repeat(256), "joao@example.com")));
    }

    @Test
    void nameIsNormalizedBeforeValidation() {
        var request = new UpdateAccountRequest("  João   Pedro ", " Joao@Example.COM ");
        assertEquals("João Pedro", request.name());
        assertEquals("joao@example.com", request.email());
    }

    @Test
    void emailNeedsFormatAndLength() {
        assertTrue(errors(new UpdateAccountRequest("João", "sem-arroba.com")) > 0);
        assertTrue(errors(new UpdateAccountRequest("João", "a@b.c")) > 0); // 5 caracteres
        assertEquals(0, errors(new UpdateAccountRequest("João", "a@b.cc")));
    }

    @Test
    void passwordNeedsEightCharactersAndAtMost72Bytes() {
        assertEquals(1, errors(new ChangePasswordRequest("atual", "1234567")));
        assertEquals(0, errors(new ChangePasswordRequest("atual", "12345678")));
        assertEquals(0, errors(new ChangePasswordRequest("atual", "é".repeat(36)))); // 72 bytes
        assertEquals(1, errors(new ChangePasswordRequest("atual", "é".repeat(37)))); // 74 bytes
        assertEquals(1, errors(new RegisterRequest("João", "joao@example.com", "a".repeat(73))));
    }
}
