from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.autenticacao import HASH_FALSO, conferir_senha, criar_sessao, gerar_hash_senha, sessao_atual, usuario_atual
from app.db import get_db
from app.esquemas import CadastroIn, LoginIn, SessaoOut, UsuarioOut
from app.tabelas import Sessao, Usuario

router = APIRouter(prefix="/api/auth", tags=["autenticação"])

# Mesma mensagem para e-mail inexistente e senha errada, para não revelar quem tem conta
CREDENCIAIS_INVALIDAS = "E-mail ou senha incorretos."


def _resposta(db: Session, usuario: Usuario) -> SessaoOut:
    token, expira_em = criar_sessao(db, usuario)
    return SessaoOut(token=token, expira_em=expira_em, usuario=UsuarioOut.model_validate(usuario))


@router.post("/cadastro", response_model=SessaoOut, status_code=status.HTTP_201_CREATED)
def cadastrar(dados: CadastroIn, db: Session = Depends(get_db)):
    if db.scalar(select(Usuario.id).where(Usuario.email == dados.email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe uma conta com este e-mail.")
    usuario = Usuario(nome=dados.nome, email=dados.email, senha_hash=gerar_hash_senha(dados.senha))
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:  # dois cadastros com o mesmo e-mail ao mesmo tempo
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe uma conta com este e-mail.") from None
    db.refresh(usuario)
    return _resposta(db, usuario)


@router.post("/login", response_model=SessaoOut)
def entrar(dados: LoginIn, db: Session = Depends(get_db)):
    usuario = db.scalar(select(Usuario).where(Usuario.email == dados.email))
    # Confere a senha mesmo sem usuário, para o tempo de resposta ser parecido nos dois casos
    senha_ok = conferir_senha(dados.senha, usuario.senha_hash if usuario else HASH_FALSO)
    if usuario is None or not senha_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=CREDENCIAIS_INVALIDAS)
    return _resposta(db, usuario)


@router.get("/eu", response_model=UsuarioOut)
def eu(usuario: Usuario = Depends(usuario_atual)):
    return usuario


@router.post("/sair", status_code=status.HTTP_204_NO_CONTENT)
def sair(sessao: Sessao = Depends(sessao_atual), db: Session = Depends(get_db)):
    db.delete(sessao)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
