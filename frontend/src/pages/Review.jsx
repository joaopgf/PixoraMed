// Etapa 2 da análise: revisar o caso e enviar a imagem para a API (POST /api/predictions).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";

import { predictionsApi } from "../api/predictionsApi";
import { Alert, PageHeader, Steps } from "../components/common";
import Icon from "../components/Icon";
import { useAnalysis } from "../context/AnalysisContext";
import { useModels } from "../hooks/useApiData";
import { findModule, formatSize, modeName } from "../utils/modules";

export default function Review() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { analysis, setLastResult } = useAnalysis();
  const models = useModels();

  const module = findModule(analysis.moduleId);
  const model = models.data?.find((item) => item.id === analysis.modelId);

  const prediction = useMutation({
    mutationFn: () => predictionsApi.predict(analysis.modelId, analysis.file),
    onSuccess: (result) => {
      // A imagem e as probabilidades ficam só nesta aba, para a tela de resultado
      setLastResult({
        ...result,
        createdAt: new Date().toISOString(),
        caseCode: analysis.caseCode.trim(),
        fileName: analysis.file?.name ?? "",
        fileUrl: analysis.fileUrl,
      });
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      navigate(`/result/${result.id}`);
    },
  });

  if (!module || !analysis.file) return <Navigate to="/new-analysis" replace />;

  return (
    <>
      <PageHeader
        label="NOVA ANÁLISE"
        title="Revisar caso"
        description="Confirme o modelo e a imagem antes de executar a análise."
        actions={
          <button type="button" className="btn secondary" onClick={() => navigate(`/analysis/${module.id}`)}>
            Voltar e editar
          </button>
        }
      />
      <Steps current={2} />
      <div className="review-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Imagem selecionada</h3>
              <p>Pré-visualização no navegador</p>
            </div>
            <span className="pill neutral">Ainda não enviada</span>
          </div>
          <div className="review-image">
            {analysis.fileUrl && <img src={analysis.fileUrl} alt="Imagem selecionada" />}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Resumo do caso</h3>
              <p>Dados informados nesta sessão</p>
            </div>
          </div>
          <div className="info-pair">
            <span>Módulo</span>
            <strong>{module.name}</strong>
          </div>
          <div className="info-pair">
            <span>Exame</span>
            <strong>{module.exam}</strong>
          </div>
          <div className="info-pair">
            <span>Modelo</span>
            <strong>{model ? `${model.id} (${modeName(model.mode)})` : analysis.modelId}</strong>
          </div>
          <div className="info-pair">
            <span>Código do caso</span>
            <strong>{analysis.caseCode.trim() || "Não informado"}</strong>
          </div>
          <div className="info-pair">
            <span>Arquivo</span>
            <strong>{analysis.file.name}</strong>
          </div>
          <div className="info-pair">
            <span>Tamanho</span>
            <strong>{formatSize(analysis.file.size)}</strong>
          </div>
          <div style={{ marginTop: 15 }}>
            {prediction.isError ? (
              <Alert icon="warning">
                <strong>A análise não foi concluída</strong>
                <br />
                {prediction.error.message}
              </Alert>
            ) : (
              <Alert>
                <strong>Ao executar</strong>
                <br />A imagem é enviada à API, passa pelo modelo e é
                descartada. O resultado fica registrado no histórico.
              </Alert>
            )}
          </div>
          <button
            type="button"
            className="btn primary"
            style={{ width: "100%", marginTop: 15 }}
            disabled={prediction.isPending}
            onClick={() => prediction.mutate()}
          >
            {prediction.isPending ? "Analisando..." : "Executar análise"} <Icon name="arrow" />
          </button>
        </section>
      </div>
    </>
  );
}
