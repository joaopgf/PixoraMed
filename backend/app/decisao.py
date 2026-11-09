"""Regra de decisão: a IA devolve probabilidades, e é o sistema que decide a classe final."""

from app.config import settings

CLASSE_INCONCLUSIVA = "inconclusivo"


def indice_previsto(probabilidades: list[float], limiar: float | None) -> int:
    """A classe mais provável ou, se o modelo tiver limiar, a segunda classe quando a probabilidade dela o alcança."""
    if limiar is not None:
        return 1 if probabilidades[1] >= limiar else 0
    return max(range(len(probabilidades)), key=probabilidades.__getitem__)


def limiar_inconclusivo(limiar: float | None) -> float | None:
    """Modelos com limiar próprio já decidem por ele; os demais ficam inconclusivos abaixo do limiar configurado."""
    return None if limiar is not None else settings.limiar_inconclusivo


def limiar_baixa_certeza(limiar: float | None) -> float | None:
    """Modelos com limiar próprio mantêm a classe, mas a tela avisa quando nenhuma classe alcança este valor."""
    return settings.limiar_inconclusivo if limiar is not None else None


def decidir(probabilidades: list[float], classes: list[str], limiar: float | None) -> tuple[str, float]:
    """Devolve a classe final (ou "inconclusivo") e a confiança, que é a probabilidade do índice previsto."""
    indice = indice_previsto(probabilidades, limiar)
    confianca = float(probabilidades[indice])
    corte = limiar_inconclusivo(limiar)
    if corte is not None and confianca < corte:
        return CLASSE_INCONCLUSIVA, confianca
    return classes[indice], confianca
