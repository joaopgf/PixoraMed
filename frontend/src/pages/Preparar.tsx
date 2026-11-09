import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { api } from "../api";
import { Alerta, CabecalhoPagina, Etapas } from "../components/Estrutura";
import Icone from "../components/Icone";
import { useEstado } from "../estado";
import {
  formatarTamanho,
  modelosDoModulo,
  nomeClasse,
  nomeModo,
  obterModulo,
} from "../modulos";

const TIPOS = ["image/png", "image/jpeg", "image/webp"];
const LIMITE_MB = 10;

export default function Preparar() {
  const { moduloId } = useParams();
  const navegar = useNavigate();
  const { analise, iniciarAnalise, atualizarAnalise, definirArquivo } =
    useEstado();
  const modelos = useQuery({ queryKey: ["modelos"], queryFn: api.modelos });
  const [erro, setErro] = useState("");
  const [arrastando, setArrastando] = useState(false);

  const modulo = obterModulo(moduloId);
  const disponiveis = modulo ? modelosDoModulo(modulo, modelos.data) : [];

  useEffect(() => {
    if (modulo && analise.moduloId !== modulo.id) iniciarAnalise(modulo.id);
  }, [modulo, analise.moduloId, iniciarAnalise]);

  // Escolhe o modelo do módulo assim que a lista chega; a API já devolve "cinza" antes de "cor"
  useEffect(() => {
    if (
      !disponiveis.length ||
      disponiveis.some((modelo) => modelo.id === analise.modeloId)
    )
      return;
    const padrao =
      disponiveis.find((modelo) => modelo.modo === "cor") ?? disponiveis[0];
    atualizarAnalise({ modeloId: padrao.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelos.data, moduloId, analise.modeloId]);

  if (!modulo) return <Navigate to="/nova" replace />;

  const modelo = disponiveis.find((item) => item.id === analise.modeloId);

  function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!TIPOS.includes(arquivo.type))
      return setErro("Formato não suportado. Selecione PNG, JPG ou WEBP.");
    if (arquivo.size > LIMITE_MB * 1024 * 1024)
      return setErro(`O arquivo passa do limite de ${LIMITE_MB} MB.`);
    setErro("");
    definirArquivo(arquivo);
  }

  const pendencia = !analise.arquivo
    ? "Selecione uma imagem para continuar."
    : !modelo
      ? "Este módulo ainda não tem modelo conectado."
      : !analise.consentimento
        ? "Confirme o uso de material autorizado e desidentificado."
        : "";

  return (
    <>
      <CabecalhoPagina
        rotulo="NOVA ANÁLISE"
        titulo="Preparar exame"
        descricao={`Módulo selecionado: ${modulo.nome}. Confira os dados antes de avançar.`}
        acoes={
          <button
            type="button"
            className="btn secondary"
            onClick={() => navegar("/nova")}
          >
            Trocar módulo
          </button>
        }
      />
      <Etapas atual={1} />
      <div className="selected-module">
        <span className="module-icon">
          <Icone nome={modulo.icone} />
        </span>
        <div style={{ flex: 1 }}>
          <strong>{modulo.nome}</strong>
          <small>
            {modulo.exame} · {modulo.area}
          </small>
        </div>
        <span className={`pill ${disponiveis.length ? "success" : "demo"}`}>
          {modelos.isLoading
            ? "Verificando modelo"
            : disponiveis.length
              ? "Modelo conectado"
              : "Modelo não conectado"}
        </span>
      </div>

      <div className="upload-layout">
        <section className="upload-panel">
          <h3>Dados do exame</h3>
          <p>
            Use somente material de teste ou de dataset público. Não informe
            nome, CPF, data de nascimento ou outro dado de paciente.
          </p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="caseCode">
                Código do caso (não identificável)
              </label>
              <input
                id="caseCode"
                type="text"
                maxLength={32}
                placeholder="Ex.: CASO-001"
                value={analise.codigoCaso}
                onChange={(evento) =>
                  atualizarAnalise({ codigoCaso: evento.target.value })
                }
              />
              <span className="hint">
                Opcional. Fica só nesta sessão; não é gravado no banco.
              </span>
            </div>
            <div className="field">
              <label htmlFor="modelo">Modelo</label>
              <select
                id="modelo"
                value={analise.modeloId}
                disabled={!disponiveis.length}
                onChange={(evento) =>
                  atualizarAnalise({ modeloId: evento.target.value })
                }
              >
                {!disponiveis.length && (
                  <option value="">Nenhum modelo disponível</option>
                )}
                {disponiveis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.cancer} · {nomeModo(item.modo)}
                  </option>
                ))}
              </select>
              {modelo && (
                <span className="hint">
                  Classes: {modelo.classes.map(nomeClasse).join(", ")}
                </span>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="imageInput">Imagem do exame</label>
            <label
              className={`dropzone${arrastando ? " dragover" : ""}`}
              htmlFor="imageInput"
              onDragOver={(evento) => {
                evento.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(evento) => {
                evento.preventDefault();
                setArrastando(false);
                escolher(evento.dataTransfer.files[0]);
              }}
            >
              <input
                id="imageInput"
                type="file"
                accept={TIPOS.join(",")}
                hidden
                onChange={(evento) => {
                  escolher(evento.target.files?.[0]);
                  evento.target.value = "";
                }}
              />
              <span className="upload-symbol">
                <Icone nome="upload" />
              </span>
              <strong>Arraste sua imagem até aqui</strong>
              <span>ou clique para selecionar um arquivo</span>
              <small>PNG, JPG ou WEBP · até {LIMITE_MB} MB</small>
            </label>
          </div>

          {analise.arquivo && analise.arquivoUrl && (
            <div className="preview-box">
              <div className="preview-top">
                <span>PRÉ-VISUALIZAÇÃO</span>
                <button
                  type="button"
                  className="text-link"
                  style={{ border: 0, background: "none" }}
                  onClick={() => definirArquivo(null)}
                >
                  Remover
                </button>
              </div>
              <img
                src={analise.arquivoUrl}
                alt="Pré-visualização do arquivo selecionado"
              />
              <div className="file-details">
                <span>{analise.arquivo.name}</span>
                <span>{formatarTamanho(analise.arquivo.size)}</span>
              </div>
            </div>
          )}

          <label className="consent-box">
            <input
              type="checkbox"
              checked={analise.consentimento}
              onChange={(evento) =>
                atualizarAnalise({ consentimento: evento.target.checked })
              }
            />
            <span>
              Confirmo que estou usando material autorizado e desidentificado.
              Entendo que a imagem é enviada ao servidor para a análise e
              descartada em seguida, e que o resultado não é um diagnóstico.
            </span>
          </label>

          <div className="upload-footer">
            <span
              className={`form-error${erro ? "" : " neutral"}`}
              aria-live="polite"
            >
              {erro || pendencia || "Tudo certo para revisar."}
            </span>
            <button
              type="button"
              className="btn primary"
              disabled={!!pendencia}
              onClick={() => navegar("/revisao")}
            >
              Revisar caso <Icone nome="arrow" />
            </button>
          </div>
        </section>

        <aside className="upload-side">
          <div className="side-info">
            <h3>
              <Icone nome="shield" /> Privacidade
            </h3>
            <p>
              A imagem é processada em memória e descartada. O banco guarda só o
              modelo, a classe prevista, a confiança e o horário.
            </p>
            <ul>
              <li>Não use imagens reais de pacientes.</li>
              <li>O arquivo deve ser compatível com o módulo escolhido.</li>
              <li>
                Selecionar o arquivo ainda não o envia: o envio acontece na
                revisão.
              </li>
            </ul>
          </div>
          <div className="side-info">
            <h3>O que acontece depois?</h3>
            <p>
              O serviço de IA repete o pré-processamento do treino (tamanho, cor
              e escala) e executa o modelo ONNX. A API usa as probabilidades
              para decidir a classe prevista.
            </p>
          </div>
          {!disponiveis.length && !modelos.isLoading && (
            <Alerta>
              <strong>Sem modelo neste módulo</strong>
              <br />
              Salve o modelo no notebook e converta para ONNX (veja{" "}
              <code>docs/salvar_modelo.md</code>). Depois, reinicie o serviço de
              IA.
            </Alerta>
          )}
        </aside>
      </div>
    </>
  );
}
