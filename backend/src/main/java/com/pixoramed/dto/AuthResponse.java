// Resposta do login e do cadastro: o token JWT, quando ele vence e o usuário logado.
package com.pixoramed.dto;

import java.time.Instant;

public record AuthResponse(String token, Instant expiresAt, UserResponse user) {
}
