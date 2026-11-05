import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import { formatarPct, SUSPEITA_VAZAMENTO } from "../dados";
import { Alerta, CabecalhoPagina } from "../components/Estrutura";
import Icone from "../components/Icone";
import { MODULOS, modelosDoModulo, nomeModo } from "../modulos";

const CHECKLIST = [
  { titulo: "Contrato da API", texto: "Formato de entrada, validação do arquivo e erros (feito em /api/previsoes)." },
  { titulo: "Pré-processamento", texto: "Tamanho, cor e escala iguais aos do treino (lidos do .json de cada modelo)." },
  { titulo: "Modelo versionado", texto: "Pesos em ONNX, com classes e métricas no .json. Falta registrar o dataset e a versão." },
  { titulo: "Validação e monitoramento", texto: "Validação clínica, desempenho por subgrupo e monitoramento: fora do escopo do projeto." },
];

export default function Modelos() {
  const navegar = useNavigate();
  const modelos = useQuery({ queryKey: ["modelos"], queryFn: api.modelos });

  return (
    <>
      <CabecalhoPagina
        rotulo="GESTÃO TÉCNICA"
        titulo="Módulos e modelos"
        descricao="Situação de cada módulo: quais modelos a API carregou e como foram avaliados."
        acoes={
          <button type="button" className="btn secondary" onClick={() => navegar("/nova")}>
            Abrir catálogo
          </button>
        }
      />
      <div style={{ marginBottom: 16 }}>
        <Alerta tipo="info" icone="activity">
          <strong>Um modelo especializado por tipo de exame.</strong>
          <br />
          Oral e Cérebro: CNN em PyTorch (3 blocos convolucionais, ~24 mil parâmetros). Pele: ensemble de 5 EfficientNet-B0 (~20 milhões de
          parâmetros no total). Todos exportados para ONNX e executados na CPU pela API.
        </Alerta>
      </div>
      {modelos.isError && (
        <div style={{ marginBottom: 16 }}>
          <Alerta>Não foi possível falar com a API: {modelos.error.message}</Alerta>
        </div>
      )}

      <div className="model-grid">
        {MODULOS.map((modulo) => {
          const lista = modelosDoModulo(modulo, modelos.data);
          return (
            <article key={modulo.id} className="model-card">
              <div className="model-card-top">
                <span className="module-icon">
                  <Icone nome={modulo.icone} />
                </span>
                <span className={`model-status${lista.length ? " on" : ""}`}>{lista.length ? "Conectado" : "Não conectado"}</span>
              </div>
              <h3>
                {modulo.nome}
                {SUSPEITA_VAZAMENTO[modulo.nome] && (
                  <span className="tag-warn" title={SUSPEITA_VAZAMENTO[modulo.nome]}>
                    vazamento
                  </span>
                )}
              </h3>
              <p>
                {modulo.descricao} Exame: {modulo.exame}.
              </p>
              {!lista.length && (
                <div className="model-spec">
                  <span>Modelo</span>
                  <strong>Ainda não salvo</strong>
                </div>
              )}
              {lista.map((modelo) => (
                <div key={modelo.id}>
                  <div className="model-spec">
                    <span>Modelo</span>
                    <strong>{modelo.id}</strong>
                  </div>
                  <div className="model-spec">
                    <span>Pré-processamento</span>
                    <strong>
                      {modelo.tamanho}×{modelo.tamanho}, {nomeModo(modelo.modo)}, {modelo.normalizado ? "normalizado" : "sem normalizar"}
                    </strong>
                  </div>
                  {modelo.limiar_inconclusivo !== null && (
                    <div className="model-spec">
                      <span>Inconclusivo abaixo de</span>
                      <strong>{Math.round(modelo.limiar_inconclusivo * 100)}% de confiança</strong>
                    </div>
                  )}
                  {modelo.limiar !== null && (
                    <div className="model-spec">
                      <span>Limiar de decisão</span>
                      <strong>{formatarPct(modelo.limiar * 100)}</strong>
                    </div>
                  )}
                  <div className="model-spec">
                    <span>Validação (5 folds)</span>
                    <strong>
                      {modelo.metricas.acc_media !== undefined
                        ? `Acurácia ${formatarPct(modelo.metricas.acc_media)} ± ${(modelo.metricas.acc_desvio ?? 0).toFixed(2)}`
                        : "Sem resultado registrado"}
                    </strong>
                  </div>
                </div>
              ))}
            </article>
          );
        })}
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <div>
            <h3>Checklist de integração</h3>
            <p>Itens técnicos para cada modelo.</p>
          </div>
        </div>
        <div className="workflow" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
          {CHECKLIST.map((item, i) => (
            <div key={item.titulo} className="workflow-step">
              <span className="step-num">{i + 1}</span>
              <div>
                <strong>{item.titulo}</strong>
                <p>{item.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
