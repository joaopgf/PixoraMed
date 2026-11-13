// Regras do login e do cadastro: e-mail único, senha com BCrypt, geração do token e log das tentativas.
package com.pixoramed.service;

import com.pixoramed.dto.AuthResponse;
import com.pixoramed.dto.LoginRequest;
import com.pixoramed.dto.RegisterRequest;
import com.pixoramed.dto.UserResponse;
import com.pixoramed.exception.ApiException;
import com.pixoramed.model.User;
import com.pixoramed.repository.UserRepository;
import com.pixoramed.security.TokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    // Mesma mensagem para e-mail inexistente e senha errada, para não revelar quem tem conta
    private static final String INVALID_CREDENTIALS = "E-mail ou senha incorretos.";
    // O log registra só o id do usuário: nunca e-mail, senha ou token
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, TokenService tokenService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    public AuthResponse register(RegisterRequest request) {
        // Nome e e-mail já chegam normalizados pelo RegisterRequest
        String email = request.email();
        if (users.existsByEmail(email)) {
            log.info("Cadastro recusado: e-mail já cadastrado");
            throw new ApiException(HttpStatus.CONFLICT, "Já existe uma conta com este e-mail.");
        }
        User user = users.save(new User(request.name(), email,passwordEncoder.encode(request.password())));
        log.info("Usuário {} cadastrado", user.getId());
        return authResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmail(request.email().trim().toLowerCase()).orElse(null);
        if (user == null) {
            log.warn("Login recusado: e-mail não cadastrado");
            throw new ApiException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            log.warn("Login recusado: senha incorreta para o usuário {}", user.getId());
            throw new ApiException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        log.info("Login do usuário {}", user.getId());
        return authResponse(user);
    }

    private AuthResponse authResponse(User user) {
        TokenService.Token token = tokenService.create(user);
        return new AuthResponse(token.value(), token.expiresAt(), UserResponse.from(user));
    }
}
