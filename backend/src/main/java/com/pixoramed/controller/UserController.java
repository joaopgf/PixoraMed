// Rotas da conta do usuário logado (/api/users/me): ver, editar, trocar a senha e excluir.
package com.pixoramed.controller;

import com.pixoramed.dto.ChangePasswordRequest;
import com.pixoramed.dto.DeleteAccountRequest;
import com.pixoramed.dto.UpdateAccountRequest;
import com.pixoramed.dto.UserResponse;
import com.pixoramed.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me")
public class UserController {

    private final AccountService accountService;

    public UserController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public UserResponse get(@AuthenticationPrincipal Jwt jwt) {
        return accountService.get(userId(jwt));
    }

    @PutMapping
    public UserResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateAccountRequest request) {
        return accountService.update(userId(jwt), request);
    }

    @PatchMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChangePasswordRequest request) {
        accountService.changePassword(userId(jwt), request);
    }

    // A senha vai no corpo do DELETE para confirmar a exclusão
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody DeleteAccountRequest request) {
        accountService.delete(userId(jwt), request);
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
