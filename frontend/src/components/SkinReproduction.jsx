// Seção da tela de resultados com as métricas e os gráficos da reprodução do treino da Pele (EfficientNet-B0).
import { Alert } from "./common";
import Panel from "./Panel";

// Números do treino rodado em 06/11/2026 no Colab (Tesla T4) com rna_cor/rna_Pele_EfficientNet.ipynb, do Projeto-ML-Cancer.
// Os intervalos de 95% vêm de bootstrap por lesão sobre as probabilidades salvas do conjunto de teste.
const METRICS = [
  {
    name: "AUC-ROC",
    value: "0,939",
    detail:
      "IC 95%: 0,922 a 0,954. Mede a separação entre as classes, sem depender do limiar.",
  },
  {
    name: "Sensibilidade",
    value: "89,0%",
    detail:
      "IC 95%: 84,1% a 93,1%. Encontrou 275 de 309 casos malignos e deixou passar 34.",
  },
  {
    name: "Especificidade",
    value: "83,7%",
    detail:
      "IC 95%: 81,6% a 86,0%. Acertou 1.344 de 1.606 casos benignos e alarmou 262.",
  },
  {
    name: "Valor preditivo positivo",
    value: "51,2%",
    detail:
      'Cerca de metade dos resultados "maligno" era de fato maligna, com 16% de malignos no teste.',
  },
  {
    name: "Acurácia balanceada",
    value: "86,3%",
    detail: "Média da sensibilidade e da especificidade.",
  },
  {
    name: "Acurácia",
    value: "84,5%",
    detail:
      'Chutar sempre "benigno" daria 83,9%: sozinha, ela diz pouco neste dataset.',
  },
];

const CHARTS = [
  {
    file: "training_curves.png",
    title: "Curvas de treino",
    text: "A perda de validação sobe enquanto a de treino cai: há sobreajuste. Por isso cada fold usa a época com a melhor AUC de validação.",
    fullWidth: true,
  },
  {
    file: "test_confusion_matrix.png",
    title: "Matriz de confusão",
    text: "Conjunto de teste, com limiar de 19% escolhido fora do teste.",
  },
  {
    file: "test_roc.png",
    title: "Curva ROC",
    text: "O ponto vermelho marca o limiar de 19%.",
  },
  {
    file: "test_calibration.png",
    title: "Calibração",
    text: "Quanto mais perto da diagonal, mais a probabilidade prevista corresponde à fração real de malignos.",
  },
  {
    file: "accuracy_by_diagnosis.png",
    title: "Acerto por diagnóstico",
    text: "O desempenho é mais fraco em dermatofibroma (45,5%, só 22 imagens) e ceratose benigna (67,8%).",
  },
];

export default function SkinReproduction() {
  return (
    <Panel
      title="Pele · EfficientNet-B0: reprodução do treino"
      description="Benigno x maligno (melanoma e carcinoma basocelular), em 1.915 imagens de teste separadas por lesão, com 5 folds no treino."
      style={{ marginBottom: 16 }}
    >
      <div style={{ marginBottom: 15 }}>
        <Alert icon="warning">
          <strong>
            Estes números não são do modelo skin_color usado nas análises.
          </strong>
          <br />O código original do modelo foi perdido, então o treino foi
          reproduzido com a mesma arquitetura e a mesma estratégia de divisão,
          mas com parâmetros definidos pelo grupo. As imagens de teste vêm da
          mesma fonte do treino, a separação é por lesão e não por paciente, e a
          queratose actínica (akiec) ficou de fora. Não houve validação clínica
          nem teste com imagens de outra origem.
        </Alert>
      </div>

      <div className="result-grid">
        {METRICS.map((metric) => (
          <article key={metric.name} className="result-metric">
            <small>{metric.name}</small>
            <strong className="mono">{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {CHARTS.map((chart) => (
          <figure
            key={chart.file}
            style={{
              margin: 0,
              gridColumn: chart.fullWidth ? "1 / -1" : undefined,
            }}
          >
            <h4 style={{ margin: "0 0 6px" }}>{chart.title}</h4>
            <img
              src={`/results/skin/${chart.file}`}
              alt={`${chart.title} da reprodução do treino da Pele`}
              loading="lazy"
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                borderRadius: 8,
                background: "#fff",
              }}
            />
            <figcaption className="tiny muted" style={{ marginTop: 6 }}>
              {chart.text}
            </figcaption>
          </figure>
        ))}
      </div>
    </Panel>
  );
}
