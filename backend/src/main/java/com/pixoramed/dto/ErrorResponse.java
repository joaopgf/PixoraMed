// Formato padrão de erro da API: {"message": "..."}. A mensagem é exibida na tela.
package com.pixoramed.dto;

public record ErrorResponse(String message) {
}
