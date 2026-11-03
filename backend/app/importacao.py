"""Importa o resultados.csv dos notebooks para o banco SQL com Pandas."""

import re
from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.tabelas import Treino

# "Pele cor grupos pesos limit1000" -> cancer="Pele", modo="cor", variante="grupos pesos limit1000"
PADRAO_DATASET = re.compile(r"^(?P<cancer>.+?)\s+(?P<modo>cor|cinza)\b\s*(?P<variante>.*)$", re.IGNORECASE)


def separar_dataset(dataset: str) -> tuple[str, str, str]:
    encontrado = PADRAO_DATASET.match(dataset.strip())
    if not encontrado:
        return dataset.strip(), "", ""
    return encontrado["cancer"], encontrado["modo"].lower(), encontrado["variante"].strip()


def tempo_em_segundos(tempo: str) -> int:
    horas, minutos, segundos = (int(parte) for parte in tempo.split(":"))
    return horas * 3600 + minutos * 60 + segundos


def ler_resultados(caminho: Path) -> pd.DataFrame:
    # Mesmo formato que o save_results dos notebooks grava: ";" e vírgula decimal (Excel em português)
    df = pd.read_csv(caminho, sep=";", decimal=",", encoding="utf-8-sig")
    df.columns = [coluna.strip() for coluna in df.columns]

    df["data_hora"] = pd.to_datetime(df["data_hora"], errors="coerce")
    df = df.dropna(subset=["data_hora", "dataset", "acc_media_%"])
    df = df.drop_duplicates(subset=["data_hora", "dataset"])

    texto = ["imagens_por_classe", "acc_por_fold_%", "f1_por_fold_%", "pasta_graficos", "gpu", "folds"]
    df[texto] = df[texto].fillna("").astype(str)
    df[["acc_desvio_%", "f1_desvio_%"]] = df[["acc_desvio_%", "f1_desvio_%"]].fillna(0.0)

    partes = df["dataset"].map(separar_dataset)
    df["cancer"] = partes.str[0]
    # O nome do dataset tem prioridade; a coluna "modo" (RGB/Cinza) cobre nomes fora do padrão
    df["modo_curto"] = partes.str[1].where(partes.str[1] != "", df["modo"].str.lower().map({"rgb": "cor", "cinza": "cinza"}))
    df["variante"] = partes.str[2]
    df["normalizado_bool"] = df["normalizado"].astype(str).str.strip().str.lower().isin(["sim", "true", "1"])
    df["tempo_segundos"] = df["tempo_total"].astype(str).map(tempo_em_segundos)
    return df.sort_values("data_hora")


def importar_resultados(db: Session, caminho: Path) -> int:
    """Acrescenta ao banco as execuções que ainda não estão lá. Retorna quantas foram inseridas."""
    if not caminho.exists():
        return 0

    df = ler_resultados(caminho)
    existentes = {(data_hora, dataset) for data_hora, dataset in db.execute(select(Treino.data_hora, Treino.dataset))}

    novos = []
    for linha in df.to_dict("records"):
        data_hora = linha["data_hora"].to_pydatetime()
        if (data_hora, linha["dataset"]) in existentes:
            continue
        novos.append(
            Treino(
                data_hora=data_hora,
                dataset=linha["dataset"],
                cancer=linha["cancer"],
                variante=linha["variante"],
                modo=linha["modo_curto"],
                normalizado=bool(linha["normalizado_bool"]),
                imagens_total=int(linha["imagens_total"]),
                imagens_por_classe=linha["imagens_por_classe"],
                tamanho=str(linha["tamanho"]),
                epocas=int(linha["epocas"]),
                batch=int(linha["batch"]),
                lr=float(linha["lr"]),
                folds=linha["folds"],
                gpu=linha["gpu"],
                tempo_total=str(linha["tempo_total"]),
                tempo_segundos=int(linha["tempo_segundos"]),
                acc_media=float(linha["acc_media_%"]),
                acc_desvio=float(linha["acc_desvio_%"]),
                f1_media=float(linha["f1_media_%"]),
                f1_desvio=float(linha["f1_desvio_%"]),
                acc_por_fold=linha["acc_por_fold_%"],
                f1_por_fold=linha["f1_por_fold_%"],
                pasta_graficos=linha["pasta_graficos"],
            )
        )

    db.add_all(novos)
    db.commit()
    return len(novos)
