import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api";
import { formatarPct, SUSPEITA_VAZAMENTO } from "../dados";
import { Alerta, CabecalhoPagina, Etapas } from "../components/Estrutura";
import Icone from "../components/Icone";
import { useEstado } from "../estado";
import { codigoRegistro, formatarData, lerModeloId, nomeModo } from "../modulos";

const AVISO_PADRAO =
  "Resultado de um modelo experimental, feito para fins acadêmicos. Não é um diagnóstico e não substitui a avaliação de um profissional de saúde.";

export default function Resultado() {
  const navegar = useNavigate();
  const id = Number(useParams().id);
  const { ultimoResultado } = useEstado();
  const atual = ultimoResultado?.id === id ? ultimoResultado : null;

  // Registros antigos vêm do banco, que não guarda imagem nem probabilidades
  const previsoes = useQuery({ queryKey: ["previsoes"], queryFn: api.previsoes, enabled: !atual });
  const modelos = useQuery({ queryKey: ["modelos"], queryFn: api.modelos });
  const registro = atual ? null : previsoes.data?.find((item) => item.id === id);

  const dados = atual ?? registro;
  if (!dados) {
    return (
      <>
        <CabecalhoPagina rotulo="DETALHE DA ANÁLISE" titulo="Resultado da análise" descricao={`Registro ${codigoRegistro(id || 0)}`} />
        <div className="panel empty">
          {previsoes.isLoading ? "Carregando..." : previsoes.isError ? previsoes.error.message : "Registro não encontrado entre os 100 mais recentes."}
        </div>
      </>
    );
  }

  const { modulo, modo } = lerModeloId(dados.modelo_id);
  const nomeModulo = modulo?.nome ?? dados.modelo_id;
  const modeloUsado = modelos.data?.find((modelo) => modelo.id === dados.modelo_id);
  const metricas = modeloUsado?.metricas;
  const vazamento = modulo && SUSPEITA_VAZAMENTO[modulo.nome];
  // Com limiar, a confiança é a probabilidade da classe prevista; o que importa é a probabilidade da classe positiva
  const limiar = atual?.limiar ?? modeloUsado?.limiar ?? null;
  const classePositiva = modeloUsado?.classes[1] ?? "maligno";
  const probPositiva = dados.classe_prevista === classePositiva ? dados.confianca : 1 - dados.confianca;
  const inconclusivo = dados.classe_prevista === "inconclusivo";
  const limiarInconclusivo = atual?.limiar_inconclusivo ?? modeloUsado?.limiar_inconclusivo ?? null;
  const fraseInconclusivo = `Resultado inconclusivo: o modelo não atingiu a confiança mínima${
    limiarInconclusivo !== null ? ` de ${Math.round(limiarInconclusivo * 100)}%` : ""
  } para indicar uma classe nesta imagem.`;

  return (
    <>
      <CabecalhoPagina
        rotulo="DETALHE DA ANÁLISE"
        titulo="Resultado da análise"
        descricao={`Registro ${codigoRegistro(dados.id)}: ${nomeModulo}.`}
        acoes={
          <button type="button" className="btn secondary" onClick={() => navegar("/historico")}>
            <Icone nome="clock" /> Histórico
          </button>
        }
      />
      {atual && <Etapas atual={3} />}

      <div className="result-banner">
        <Icone nome="info" />
        <div>
          <strong>MODELO EXPERIMENTAL: ESTE RESULTADO NÃO É UM DIAGNÓSTICO</strong>
          <p>{atual?.aviso ?? AVISO_PADRAO}</p>
        </div>
      </div>

      <div className="result-grid">
        <article className="result-metric">
          <small>{inconclusivo ? "Resultado" : "Classe prevista"}</small>
          <strong>{inconclusivo ? "Inconclusivo" : dados.classe_prevista}</strong>
          <p>
            {inconclusivo
              ? "O sistema não indica uma classe quando a confiança fica abaixo do limiar."
              : limiar !== null
                ? `Vira "${classePositiva}" quando a probabilidade alcança o limiar de ${formatarPct(limiar * 100)}, mesmo abaixo de 50%.`
                : "A classe mais provável entre as classes usadas no treino."}
          </p>
        </article>
        {limiar !== null ? (
          <article className="result-metric">
            <small>Probabilidade estimada de {classePositiva}</small>
            <strong className="mono">{formatarPct(probPositiva * 100)}</strong>
            <p>Média calibrada de 5 modelos no dataset de treino. Não é o risco clínico deste paciente.</p>
          </article>
        ) : (
          <article className="result-metric">
            <small>Confiança do modelo</small>
            <strong className="mono">{formatarPct(dados.confianca * 100)}</strong>
            <p>Saída softmax da rede, não uma probabilidade calibrada de doença.</p>
          </article>
        )}
        <article className="result-metric">
          <small>Modelo</small>
          <strong>{dados.modelo_id}</strong>
          <p>
            {nomeModo(modo)} · executado em {dados.tempo_ms.toFixed(0)} ms
          </p>
        </article>
      </div>

      {inconclusivo && (
        <div style={{ marginBottom: 15 }}>
          <Alerta icone="warning">
            <strong>{fraseInconclusivo}</strong>
          </Alerta>
        </div>
      )}

      {vazamento && (
        <div style={{ marginBottom: 15 }}>
          <Alerta icone="warning">
            <strong>Métrica possivelmente inflada neste módulo.</strong>
            <br />
            {vazamento}
          </Alerta>
        </div>
      )}

      <div className="result-placeholder">
        <div className="placeholder-box">
          {atual ? (
            <>
              <h4>Probabilidade por classe</h4>
              <div className="prob-list" style={{ marginTop: 12 }}>
                {atual.probabilidades.map((item) => (
                  <div key={item.classe}>
                    <div className="prob-top">
                      <span>{item.classe}</span>
                      <span>{formatarPct(item.probabilidade * 100)}</span>
                    </div>
                    <div className="prob-bar">
                      <span style={{ width: `${Math.max(item.probabilidade * 100, 0.5)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h4>Probabilidade por classe</h4>
              <p>Disponível só logo após a análise. O histórico guarda apenas a classe prevista e a confiança.</p>
            </>
          )}
        </div>
        <div className="placeholder-box">
          <h4>Imagem analisada</h4>
          <p>{atual ? atual.arquivoNome : "A imagem não fica guardada depois da análise."}</p>
          {atual?.arquivoUrl ? (
            <img className="result-preview-image" src={atual.arquivoUrl} alt="Imagem enviada para a análise" />
          ) : (
            <div className="placeholder-graphic">Imagem descartada</div>
          )}
        </div>
      </div>

      <section className="panel" style={{ marginTop: 15 }}>
        <div className="panel-head">
          <div>
            <h3>Identificação</h3>
            <p>Metadados da análise</p>
          </div>
        </div>
        <div className="info-pair">
          <span>Identificador</span>
          <strong>{codigoRegistro(dados.id)}</strong>
        </div>
        {atual?.codigoCaso && (
          <div className="info-pair">
            <span>Código do caso</span>
            <strong>{atual.codigoCaso}</strong>
          </div>
        )}
        <div className="info-pair">
          <span>Módulo</span>
          <strong>{nomeModulo}</strong>
        </div>
        <div className="info-pair">
          <span>Data</span>
          <strong>{formatarData(atual ? atual.criadoEm : registro!.criado_em)}</strong>
        </div>
        {metricas?.acc_media !== undefined && (
          <div className="info-pair">
            <span>Desempenho na validação (5 folds)</span>
            <strong className="mono">
              Acurácia {formatarPct(metricas.acc_media)}
              {metricas.f1_media !== undefined && ` · F1 ${formatarPct(metricas.f1_media)}`}
            </strong>
          </div>
        )}
      </section>

      <div className="placeholder-box" style={{ marginTop: 15, minHeight: 0 }}>
        <h4>Explicabilidade / mapa de atenção</h4>
        <p>Ainda não implementado. Este espaço é reservado para o Grad-CAM, caso o grupo decida incluir.</p>
      </div>

      <div style={{ marginTop: 15 }}>
        <Alerta tipo="info" icone="shield">
          <strong>Revisão profissional obrigatória.</strong>
          <br />
          Qualquer uso real exigiria validação clínica, controle de qualidade da imagem e trilha de auditoria. Veja também a página de limitações.
        </Alerta>
      </div>

      <div className="head-actions" style={{ marginTop: 17 }}>
        <button type="button" className="btn primary" onClick={() => navegar("/nova")}>
          Iniciar outra análise <Icone nome="arrow" />
        </button>
        <button type="button" className="btn secondary" onClick={() => navegar("/limitacoes")}>
          Ver limitações
        </button>
      </div>
    </>
  );
}
