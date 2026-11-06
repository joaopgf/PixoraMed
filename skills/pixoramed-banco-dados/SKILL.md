---
name: pixoramed-banco-dados
description: Crie a persistência do PixoraMed com SQLAlchemy, PostgreSQL ou SQLite, e a importação do resultados.csv com Pandas. Use ao criar ou alterar tabelas, a conexão com o banco ou o tratamento dos resultados dos treinos.
---

# Banco de dados e importação

Use SQLAlchemy 2 (`Mapped`, `mapped_column`). PostgreSQL no Docker e na nuvem (Neon); SQLite em `data/pixoramed.db` quando não houver `DATABASE_URL`. As tabelas são criadas no início com `Base.metadata.create_all(engine)`.

## Conexão: `app/db.py`

Neon e Render entregam `postgres://` ou `postgresql://`; o SQLAlchemy precisa do driver psycopg 3:

```python
def normalizar_url(url: str) -> str:
    for prefixo in ("postgres://", "postgresql://"):
        if url.startswith(prefixo):
            return "postgresql+psycopg://" + url[len(prefixo):]
    return url
```

Crie o engine com `pool_pre_ping=True`; no SQLite, passe `check_same_thread=False`. Use `sessionmaker(bind=engine, autoflush=False)`, a dependência `get_db()` que sempre fecha a sessão e `class Base(DeclarativeBase)`.

## Tabelas: `app/tabelas.py`

**`treinos`:** uma execução de um notebook. Restrição única `uq_treino_execucao` em (`data_hora`, `dataset`).

| Coluna | Tipo |
|---|---|
| `id` | inteiro, chave primária |
| `data_hora` | `DateTime` |
| `dataset` | `String(120)` |
| `cancer` | `String(60)`, com índice |
| `variante` | `String(120)`, padrão vazio |
| `modo` | `String(10)`: `cor` ou `cinza` |
| `normalizado` | booleano |
| `imagens_total`, `epocas`, `batch`, `tempo_segundos` | inteiros |
| `imagens_por_classe` | `String(500)`, padrão vazio |
| `tamanho`, `tempo_total` | `String(20)` |
| `lr`, `acc_media`, `acc_desvio`, `f1_media`, `f1_desvio` | `Float` |
| `folds` | `String(10)` |
| `gpu` | `String(80)` |
| `acc_por_fold`, `f1_por_fold` | `String(200)`, padrão vazio |
| `pasta_graficos` | `String(300)`, padrão vazio |

**`previsoes`:** histórico das análises. **Não crie coluna para a imagem nem para dados de paciente.**

| Coluna | Tipo |
|---|---|
| `id` | inteiro, chave primária |
| `criado_em` | `DateTime`, padrão `datetime.now(timezone.utc)` |
| `modelo_id` | `String(60)`, com índice |
| `classe_prevista` | `String(60)`, incluindo `inconclusivo` |
| `confianca` | `Float`: probabilidade da classe prevista |
| `tempo_ms` | `Float` |

## Importação: `app/importacao.py`

Implemente com Pandas, nesta ordem:

```python
PADRAO_DATASET = re.compile(r"^(?P<cancer>.+?)\s+(?P<modo>cor|cinza)\b\s*(?P<variante>.*)$", re.IGNORECASE)
```

`ler_resultados(caminho)`:

1. `pd.read_csv(caminho, sep=";", decimal=",", encoding="utf-8-sig")` e limpe os nomes das colunas.
2. Converta `data_hora` com `errors="coerce"`.
3. Remova linhas sem `data_hora`, `dataset` ou `acc_media_%`, e duplicatas por (`data_hora`, `dataset`).
4. Preencha nulos: textos com `""`, e `acc_desvio_%` e `f1_desvio_%` com `0.0`.
5. Separe `cancer`, `modo_curto` e `variante`. O nome do dataset tem prioridade; a coluna `modo` (`RGB`/`Cinza`) cobre nomes fora do padrão.
6. Converta `normalizado` (`sim`, `true` ou `1`) para booleano e `tempo_total` (`HH:MM:SS`) para segundos.
7. Ordene por `data_hora`.

`importar_resultados(db, caminho)`: se o arquivo não existir, retorne 0. Insira só execuções novas e retorne a quantidade.

`separar_dataset` deve garantir:

```python
separar_dataset("Mama cor") == ("Mama", "cor", "")
separar_dataset("Colo do útero cinza") == ("Colo do útero", "cinza", "")
separar_dataset("Pele cor grupos pesos limit1000") == ("Pele", "cor", "grupos pesos limit1000")
```

Se o nome não seguir o padrão, `separar_dataset` devolve `(dataset.strip(), "", "")`.

`backend/scripts/importar_resultados.py` recebe o caminho do CSV (padrão: `settings.resultados_csv`) e importa sob demanda. Comece com `sys.path.insert(0, str(Path(__file__).resolve().parents[1]))`, para encontrar o pacote `app`. Todos os treinos antigos ficam no banco; o front filtra os módulos do catálogo.

## Verificação

- Rode a importação duas vezes: a segunda deve inserir 0.
- Confirme a conexão em SQLite e em PostgreSQL.
- Confirme que nenhuma tabela guarda imagem ou dado de paciente.
- No pgAdmin do Docker: host `localhost`, porta `5433`, banco, usuário e senha `pixoramed`. **Não rode `docker compose down -v`: isso apaga o banco.**
