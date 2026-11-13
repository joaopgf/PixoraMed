// Regras dos dados da conta, usadas no cadastro e na edição: tamanhos, mensagens e o limite de bytes do BCrypt.
package com.pixoramed.dto;

import java.nio.charset.StandardCharsets;

public final class AccountRules {

    public static final int NAME_MIN = 2;
    public static final int NAME_MAX = 255;
    public static final int EMAIL_MIN = 6;
    public static final int EMAIL_MAX = 254;
    public static final int PASSWORD_MIN = 8;
    // O BCrypt só usa os 72 primeiros bytes da senha: o que passar disso seria ignorado sem aviso.
    // Letra com acento ou cedilha ocupa 2 bytes em UTF-8.
    public static final int PASSWORD_MAX_BYTES = 72;

    public static final String NAME_MESSAGE = "O nome precisa ter de 2 a 255 caracteres.";
    public static final String EMAIL_MESSAGE = "Informe um e-mail válido, com 6 a 254 caracteres.";
    public static final String PASSWORD_MIN_MESSAGE = " precisa ter pelo menos 8 caracteres.";
    public static final String PASSWORD_BYTES_MESSAGE = " passa do limite de 72 bytes: letras com acento ou cedilha "
            + "contam como 2. Use uma senha mais curta ou com menos acentos.";

    private AccountRules() {
    }

    // Junta espaços repetidos e tira os das pontas (nunca usado na senha: espaço nela faz parte da credencial)
    public static String normalizeName(String name) {
        return name == null ? null : name.trim().replaceAll("\s+", " ");
    }

    // E-mail sempre sem espaços nas pontas e em minúsculas
    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    // null conta como válido: quem recusa senha vazia é o @NotBlank
    public static boolean fitsBcrypt(String password) {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= PASSWORD_MAX_BYTES;
    }
}
