import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import { formatarPct } from "../dados";
import { CabecalhoPagina, LinkTexto } from "../components/Estrutura";
import Icone from "../components/Icone";
import { codigoRegistro, formatarData, lerModeloId, MODULOS } from "../modulos";

const FLUXO = [
  { titulo: "Selecionar módulo", texto: "Escolher o módulo compatível com a imagem." },
  { titulo: "Preparar o caso", texto: "Anexar a imagem e conferir o modelo que será usado." },
  { titulo: "Revisar o retorno", texto: "Consultar a classe prevista, as probabilidades e as limitações." },
];

const doisDigitos = (valor?: number) => (valor === undefined ? "–" : String(valor).padStart(2, "0"));

export default function Painel() {
  const navegar = useNavigate();
  const modelos = useQuery({ queryKey: ["modelos"], queryFn: api.modelos });
  const treinos = useQuery({ queryKey: ["treinos"], queryFn: api.treinos });
  const previsoes = useQuery({ queryKey: ["previsoes"], queryFn: api.previsoes });

  const metricas = [
    { rotulo: "MÓDULOS NO CATÁLOGO", valor: doisDigitos(MODULOS.length), nota: "Tipos de câncer na plataforma", icone: "layers" },
    { rotulo: "MODELOS CONECTADOS", valor: doisDigitos(modelos.data?.length), nota: "Modelos ONNX carregados na API", icone: "activity" },
    { rotulo: "TREINOS REGISTRADOS", valor: doisDigitos(treinos.data?.length), nota: "Execuções de 5 folds no banco", icone: "chart" },
    { rotulo: "ANÁLISES RECENTES", valor: doisDigitos(previsoes.data?.length), nota: "Previsões no histórico (até 100)", icone: "file" },
  ];

  return (
    <>
      <CabecalhoPagina
        rotulo="VISÃO GERAL"
        titulo="Painel de trabalho"
        descricao="Acompanhe o ambiente, acesse módulos e inicie uma nova análise."
        acoes={
          <button type="button" className="btn primary" onClick={() => navegar("/nova")}>
            <Icone nome="plusfile" /> Nova análise
          </button>
        }
      />

      <section className="welcome-panel">
        <div className="welcome-copy">
          <div className="eyebrow">ESPAÇO DE TRABALHO</div>
          <h2>Bem-vindo à PixoraMed.</h2>
          <p>Analise imagens com os modelos treinados pelo grupo, acompanhe o histórico e compare os resultados dos treinos em um único ambiente.</p>
          <button type="button" className="btn primary" onClick={() => navegar("/nova")}>
            Começar uma análise <Icone nome="arrow" />
          </button>
        </div>
        <div className="welcome-art">
          <img src="/organs/cerebro.webp" alt="Visualização ilustrativa de cérebro holográfico" />
        </div>
      </section>

      <section className="metric-grid">
        {metricas.map((metrica) => (
          <article key={metrica.rotulo} className="metric">
            <div className="metric-head">
              <span>{metrica.rotulo}</span>
              <span className="metric-icon">
                <Icone nome={metrica.icone} />
              </span>
            </div>
            <strong>{metrica.valor}</strong>
            <small>{metrica.nota}</small>
          </article>
        ))}
      </section>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Acesso rápido aos módulos</h3>
              <p>Selecione a área para iniciar uma análise.</p>
            </div>
            <LinkTexto para="/nova">Ver todos →</LinkTexto>
          </div>
          <div className="quick-grid">
            {MODULOS.slice(0, 6).map((modulo) => (
              <button key={modulo.id} type="button" className="quick-card" onClick={() => navegar(`/analise/${modulo.id}`)}>
                <span className="module-icon">
                  <Icone nome={modulo.icone} />
                </span>
                <strong>{modulo.nome}</strong>
                <small>{modulo.exame}</small>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel">
          <div className="panel-head">
            <div>
              <h3>Fluxo de trabalho</h3>
              <p>Etapas de uma análise</p>
            </div>
          </div>
          <div className="workflow">
            {FLUXO.map((etapa, i) => (
              <div key={etapa.titulo} style={{ display: "contents" }}>
                {i > 0 && <div className="workflow-line" />}
                <div className="workflow-step">
                  <span className="step-num">{i + 1}</span>
                  <div>
                    <strong>{etapa.titulo}</strong>
                    <p>{etapa.texto}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <div>
            <h3>Atividade recente</h3>
            <p>Últimas previsões registradas no banco.</p>
          </div>
          <LinkTexto para="/historico">Abrir histórico →</LinkTexto>
        </div>
        {previsoes.isError && <div className="empty">Não foi possível carregar: {previsoes.error.message}</div>}
        {previsoes.data?.length === 0 && <div className="empty">Nenhuma análise feita ainda.</div>}
        <div className="activity-list">
          {previsoes.data?.slice(0, 3).map((registro) => {
            const { modulo } = lerModeloId(registro.modelo_id);
            return (
              <div key={registro.id} className="activity-row">
                <div className="activity-main">
                  <span className="activity-symbol">
                    <Icone nome={modulo?.icone ?? "image"} />
                  </span>
                  <div>
                    <strong>
                      {modulo?.nome ?? registro.modelo_id} · {codigoRegistro(registro.id)}
                    </strong>
                    <small>{formatarData(registro.criado_em)}</small>
                  </div>
                </div>
                <div className="activity-state">
                  <strong>{registro.classe_prevista}</strong>
                  <small>Confiança {formatarPct(registro.confianca * 100)}</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
