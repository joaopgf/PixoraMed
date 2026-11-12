// Etapa 1 da análise: escolher o modelo, anexar a imagem e confirmar o consentimento.
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { Alert, PageHeader, Steps } from "../components/common";
import Icon from "../components/Icon";
import ImageDropzone from "../components/ImageDropzone";
import { useAnalysis } from "../context/AnalysisContext";
import { useModels } from "../hooks/useApiData";
import {
  className,
  findModule,
  formatSize,
  modeName,
  modelsForModule,
} from "../utils/modules";

const MAX_MB = 10;

export default function PrepareExam() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { analysis, startAnalysis, updateAnalysis, setFile } = useAnalysis();
  const models = useModels();
  const [error, setError] = useState("");

  const module = findModule(moduleId);
  const available = module ? modelsForModule(module, models.data) : [];

  useEffect(() => {
    if (module && analysis.moduleId !== module.id) startAnalysis(module.id);
  }, [module, analysis.moduleId, startAnalysis]);

  if (!module) return <Navigate to="/new-analysis" replace />;

  // Modelo usado: o escolhido no campo ou, sem escolha, o colorido do módulo (se houver).
  // Calculado no render, sem useEffect; vai para a análise quando o usuário avança para a revisão
  const model =
    available.find((item) => item.id === analysis.modelId) ??
    available.find((item) => item.mode === "color") ??
    available[0];

  const pending = !analysis.file
    ? "Selecione uma imagem para continuar."
    : !model
      ? "Aguarde o modelo carregar para continuar."
      : !analysis.consent
        ? "Confirme o uso de material autorizado e desidentificado."
        : "";

  return (
    <>
      <PageHeader
        label="NOVA ANÁLISE"
        title="Preparar exame"
        description={`Módulo selecionado: ${module.name}. Confira os dados antes de avançar.`}
        actions={
          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate("/new-analysis")}
          >
            Trocar módulo
          </button>
        }
      />
      <Steps current={1} />
      <div className="selected-module">
        <span className="module-icon">
          <Icon name={module.icon} />
        </span>
        <div style={{ flex: 1 }}>
          <strong>{module.name}</strong>
          <small>
            {module.exam} · {module.area}
          </small>
        </div>
        <span className={`pill ${available.length ? "success" : "demo"}`}>
          {models.isLoading
            ? "Verificando modelo"
            : available.length
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
                value={analysis.caseCode}
                onChange={(event) =>
                  updateAnalysis({ caseCode: event.target.value })
                }
              />
              <span className="hint">
                Opcional. Fica só nesta sessão; não é gravado no banco.
              </span>
            </div>
            <div className="field">
              <label htmlFor="model">Modelo</label>
              <select
                id="model"
                value={model?.id ?? ""}
                disabled={!available.length}
                onChange={(event) =>
                  updateAnalysis({ modelId: event.target.value })
                }
              >
                {!available.length && (
                  <option value="">Carregando modelo...</option>
                )}
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {module.name} · {modeName(item.mode)}
                  </option>
                ))}
              </select>
              {model && (
                <span className="hint">
                  Classes: {model.classes.map(className).join(", ")}
                </span>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="imageInput">Imagem do exame</label>
            <ImageDropzone
              id="imageInput"
              maxMb={MAX_MB}
              onFile={setFile}
              onError={setError}
            />
          </div>

          {analysis.moduleId === module.id && analysis.fileUrl && (
            <div className="preview-box">
              <div className="preview-top">
                <span>PRÉ-VISUALIZAÇÃO</span>
                <button
                  type="button"
                  className="text-link"
                  style={{ border: 0, background: "none" }}
                  onClick={() => setFile(null)}
                >
                  Remover
                </button>
              </div>
              <img
                src={analysis.fileUrl}
                alt="Pré-visualização do arquivo selecionado"
              />
              <div className="file-details">
                <span>{analysis.file.name}</span>
                <span>{formatSize(analysis.file.size)}</span>
              </div>
            </div>
          )}

          <label className="consent-box">
            <input
              type="checkbox"
              checked={analysis.consent}
              onChange={(event) =>
                updateAnalysis({ consent: event.target.checked })
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
              className={`form-error${error ? "" : " neutral"}`}
              aria-live="polite"
            >
              {error || pending || "Tudo certo para revisar."}
            </span>
            <button
              type="button"
              className="btn primary"
              disabled={!!pending}
              onClick={() => {
                updateAnalysis({ modelId: model.id });
                navigate("/review");
              }}
            >
              Revisar caso <Icon name="arrow" />
            </button>
          </div>
        </section>

        <aside className="upload-side">
          <div className="side-info">
            <h3>
              <Icon name="shield" /> Privacidade
            </h3>
            <p>
              A imagem é processada em memória e descartada. O banco guarda só o
              modelo, o resultado, as probabilidades e o horário.
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
          {!available.length && !models.isLoading && (
            <Alert>
              <strong>Carregando o modelo</strong>
              <br />
              Aguarde alguns instantes: o modelo deste módulo está sendo
              carregado. A página tenta de novo sozinha e libera a análise assim
              que ele estiver pronto.
            </Alert>
          )}
        </aside>
      </div>
    </>
  );
}
