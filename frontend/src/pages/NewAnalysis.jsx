// Catálogo de módulos para iniciar uma análise, com o status de conexão de cada modelo.
import { useNavigate } from "react-router-dom";

import { Alert, PageHeader } from "../components/common";
import Icon from "../components/Icon";
import { useModels } from "../hooks/useApiData";
import { MODULES, modelsForModule } from "../utils/modules";

export default function NewAnalysis() {
  const navigate = useNavigate();
  const models = useModels();

  return (
    <>
      <PageHeader
        label="CATÁLOGO"
        title="Módulos de análise"
        description="Cada módulo envia a imagem para o modelo treinado só para aquele tipo de exame."
        actions={
          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate("/models")}
          >
            <Icon name="layers" /> Ver status técnico
          </button>
        }
      />
      <div style={{ marginBottom: 16 }}>
        <Alert type="info">
          <strong>Use o módulo certo para cada imagem.</strong>
          <br />O modelo não reconhece imagens de outro tipo de exame: ele pode
          indicar uma das classes do treino mesmo assim. Em Oral e Cérebro, a
          resposta vira "inconclusivo" quando a confiança fica abaixo de 80%.
        </Alert>
      </div>
      {models.isLoading && (
        <div style={{ marginBottom: 16 }}>
          <Alert type="info">
            Conectando ao serviço de IA. Depois de um tempo sem uso, ele leva
            até 1 minuto para responder.
          </Alert>
        </div>
      )}
      {models.isError && (
        <div style={{ marginBottom: 16 }}>
          <Alert>
            Não foi possível falar com a API: {models.error.message}
          </Alert>
        </div>
      )}
      <div className="module-list-grid">
        {MODULES.map((module) => {
          const connected = modelsForModule(module, models.data).length > 0;
          return (
            <button
              key={module.id}
              type="button"
              className="module-tile"
              onClick={() => navigate(`/analysis/${module.id}`)}
            >
              <span className="module-icon">
                <Icon name={module.icon} />
              </span>
              <span className="module-tile-copy">
                <strong>{module.name}</strong>
                <small>
                  {module.exam} · {module.area}
                </small>
                <span className={`status-mini${connected ? " on" : ""}`}>
                  {models.isLoading
                    ? "CONECTANDO..."
                    : connected
                      ? "MODELO CONECTADO"
                      : "MODELO NÃO CONECTADO"}
                </span>
              </span>
              <Icon name="chevron" />
            </button>
          );
        })}
      </div>
    </>
  );
}
