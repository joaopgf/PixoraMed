// Conta do usuário logado: ver, editar nome e e-mail, trocar a senha e excluir a conta com o histórico.
package com.pixoramed.service;

import com.pixoramed.dto.ChangePasswordRequest;
import com.pixoramed.dto.DeleteAccountRequest;
import com.pixoramed.dto.UpdateAccountRequest;
import com.pixoramed.dto.UserResponse;
import com.pixoramed.exception.ApiException;
import com.pixoramed.model.User;
import com.pixoramed.repository.PredictionRepository;
import com.pixoramed.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    // Senha errada responde 400, não 401: o site trata 401 como sessão vencida e faria logout
    private static final String WRONG_PASSWORD = "Senha atual incorreta.";
    // O log registra só o id do usuário: nunca e-mail, senha ou token
    private static final Logger log = LoggerFactory.getLogger(AccountService.class);

    private final UserRepository users;
    private final PredictionRepository predictions;
    private final PasswordEncoder passwordEncoder;

    public AccountService(UserRepository users, PredictionRepository predictions, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.predictions = predictions;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse get(Long userId) {
        return UserResponse.from(find(userId));
    }

    @Transactional
    public UserResponse update(Long userId, UpdateAccountRequest request) {
        User user = find(userId);
        if (users.existsByEmailAndIdNot(request.email(), userId)) {
            log.info("Edição recusada: e-mail já usado por outra conta (usuário {})", userId);
            throw new ApiException(HttpStatus.CONFLICT, "Já existe uma conta com este e-mail.");
        }
        user.setName(request.name());
        user.setEmail(request.email());
        log.info("Usuário {} alterou os dados da conta", userId);
        return UserResponse.from(user);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = find(userId);
        checkPassword(user, request.currentPassword());
        // O hash tem salt, então a comparação com a senha atual só é possível pelo matches
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A nova senha precisa ser diferente da atual.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        log.info("Usuário {} trocou a senha", userId);
    }

    // Exclusão definitiva (hard delete): apaga o histórico de análises e depois a conta, na mesma transação
    @Transactional
    public void delete(Long userId, DeleteAccountRequest request) {
        User user = find(userId);
        checkPassword(user, request.password());
        int removed = predictions.deleteByUserId(userId);
        users.delete(user);
        log.info("Usuário {} excluiu a conta ({} análises apagadas)", userId, removed);
    }

    // Token válido de uma conta que já foi excluída: 401 faz o site voltar para o login
    private User find(Long userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Conta não encontrada. Entre novamente."));
    }

    private void checkPassword(User user, String password) {
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            log.warn("Senha atual incorreta na conta do usuário {}", user.getId());
            throw new ApiException(HttpStatus.BAD_REQUEST, WRONG_PASSWORD);
        }
    }
}
