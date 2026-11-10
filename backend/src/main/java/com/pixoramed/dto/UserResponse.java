// Dados públicos de um usuário (nunca inclui o hash da senha).
package com.pixoramed.dto;

import com.pixoramed.model.User;
import java.time.Instant;

public record UserResponse(Long id, String name, String email, Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }
}
