"""Senhas, tokens de sessão e a dependência que exige login nas rotas."""

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.tabelas import Sessao, Usuario, agora

# scrypt com 16 MB de memória por tentativa: lento para quem tenta adivinhar a senha, rápido o bastante para o login
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1


def _b64(dados: bytes) -> str:
    return base64.b64encode(dados).decode()


def gerar_hash_senha(senha: str) -> str:
    salt = secrets.token_bytes(16)
    chave = hashlib.scrypt(senha.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=32)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${_b64(salt)}${_b64(chave)}"


def conferir_senha(senha: str, guardado: str) -> bool:
    try:
        algoritmo, n, r, p, salt, chave = guardado.split("$")
        if algoritmo != "scrypt":
            return False
        calculada = hashlib.scrypt(
            senha.encode(), salt=base64.b64decode(salt), n=int(n), r=int(r), p=int(p), dklen=len(base64.b64decode(chave))
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(calculada, base64.b64decode(chave))


# Usado quando o e-mail não existe, para o tempo de resposta não revelar quais e-mails têm conta
HASH_FALSO = gerar_hash_senha(secrets.token_urlsafe(16))


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def criar_sessao(db: Session, usuario: Usuario) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    expira_em = agora() + timedelta(hours=settings.sessao_horas)
    # Aproveita o login para apagar as sessões vencidas do usuário
    db.execute(delete(Sessao).where(Sessao.usuario_id == usuario.id, Sessao.expira_em <= agora()))
    db.add(Sessao(usuario_id=usuario.id, token_hash=hash_token(token), expira_em=expira_em))
    db.commit()
    return token, expira_em


_bearer = HTTPBearer(auto_error=False)

NAO_AUTENTICADO = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Sessão expirada ou inválida. Entre novamente.",
    headers={"WWW-Authenticate": "Bearer"},
)


def sessao_atual(
    credenciais: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Sessao:
    if credenciais is None:
        raise NAO_AUTENTICADO
    sessao = db.scalar(select(Sessao).where(Sessao.token_hash == hash_token(credenciais.credentials)))
    if sessao is None or sessao.expira_em <= agora():
        raise NAO_AUTENTICADO
    return sessao


def usuario_atual(sessao: Sessao = Depends(sessao_atual), db: Session = Depends(get_db)) -> Usuario:
    usuario = db.get(Usuario, sessao.usuario_id)
    if usuario is None:
        raise NAO_AUTENTICADO
    return usuario
