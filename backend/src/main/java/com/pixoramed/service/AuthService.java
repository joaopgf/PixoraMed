// Regras do login e do cadastro: e-mail único, senha com BCrypt e geração do token.
package com.pixoramed.service;

import com.pixoramed.dto.AuthResponse;
import com.pixoramed.dto.LoginRequest;
import com.pixoramed.dto.RegisterRequest;
import com.pixoramed.dto.UserResponse;
import com.pixoramed.exception.ApiException;
import com.pixoramed.model.User;
import com.pixoramed.repository.UserRepository;
import com.pixoramed.security.TokenService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    // Mesma mensagem para e-mail inexistente e senha errada, para não revelar quem tem conta
    private static final String INVALID_CREDENTIALS = "E-mail ou senha incorretos.";

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, TokenService tokenService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Já existe uma conta com este e-mail.");
        }
        String name = request.name().trim().replaceAll("\\s+", " ");
        User user = users.save(new User(name, email, passwordEncoder.encode(request.password())));
        return authResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmail(request.email().trim().toLowerCase())
                .filter(found -> passwordEncoder.matches(request.password(), found.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS));
        return authResponse(user);
    }

    private AuthResponse authResponse(User user) {
        TokenService.Token token = tokenService.create(user);
        return new AuthResponse(token.value(), token.expiresAt(), UserResponse.from(user));
    }
}
