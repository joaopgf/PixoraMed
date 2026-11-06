import { Alerta } from "./Estrutura";

// Números do treino rodado em 06/11/2026 no Colab (Tesla T4) com rna_cor/rna_Pele_EfficientNet.ipynb, do Projeto-ML-Cancer.
// Os intervalos de 95% vêm de bootstrap por lesão sobre as probabilidades salvas do conjunto de teste.
const METRICAS = [
  { nome: "AUC-ROC", valor: "0,939", detalhe: "IC 95%: 0,922 a 0,954. Mede a separação entre as classes, sem depender do limiar." },
  { nome: "Sensibilidade", valor: "89,0%", detalhe: "IC 95%: 84,1% a 93,1%. Encontrou 275 de 309 casos malignos e deixou passar 34." },
  { nome: "Especificidade", valor: "83,7%", detalhe: "IC 95%: 81,6% a 86,0%. Acertou 1.344 de 1.606 casos benignos e alarmou 262." },
  { nome: "Valor preditivo positivo", valor: "51,2%", detalhe: 'Cerca de metade dos resultados "maligno" era de fato maligna, com 16% de malignos no teste.' },
  { nome: "Acurácia balanceada", valor: "86,3%", detalhe: "Média da sensibilidade e da especificidade." },
  { nome: "Acurácia", valor: "84,5%", detalhe: 'Chutar sempre "benigno" daria 83,9%: sozinha, ela diz pouco neste dataset.' },
];

const GRAFICOS = [
  { arquivo: "curvas_treino.png", titulo: "Curvas de treino", texto: "A perda de validação sobe enquanto a de treino cai: há sobreajuste. Por isso cada fold usa a época com a melhor AUC de validação." },
  { arquivo: "matriz_confusao_teste.png", titulo: "Matriz de confusão", texto: "Conjunto de teste, com limiar de 19% escolhido fora do teste." },
  { arquivo: "roc_teste.png", titulo: "Curva ROC", texto: "O ponto vermelho marca o limiar de 19%." },
  { arquivo: "calibracao_teste.png", titulo: "Calibração", texto: "Quanto mais perto da diagonal, mais a probabilidade prevista corresponde à fração real de malignos." },
  { arquivo: "acerto_por_diagnostico.png", titulo: "Acerto por diagnóstico", texto: "O desempenho é mais fraco em dermatofibroma (45,5%, só 22 imagens) e ceratose benigna (67,8%)." },
];

export default function ReproducaoPele() {
  return (
    <section className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head">
        <div>
          <h3>Pele · EfficientNet-B0: reprodução do treino</h3>
          <p>Benigno x maligno (melanoma e carcinoma basocelular), em 1.915 imagens de teste separadas por lesão, com 5 folds no treino.</p>
        </div>
      </div>

      <div style={{ marginBottom: 15 }}>
        <Alerta icone="warning">
          <strong>Estes números não são do modelo pele_cor usado nas análises.</strong>
          <br />
          O código original do modelo foi perdido, então o treino foi reproduzido com a mesma arquitetura e a mesma estratégia de divisão, mas com
          parâmetros definidos pelo grupo. As imagens de teste vêm da mesma fonte do treino, a separação é por lesão e não por paciente, e a
          queratose actínica (akiec) ficou de fora. Não houve validação clínica nem teste com imagens de outra origem.
        </Alerta>
      </div>

      <div className="result-grid">
        {METRICAS.map((metrica) => (
          <article key={metrica.nome} className="result-metric">
            <small>{metrica.nome}</small>
            <strong className="mono">{metrica.valor}</strong>
            <p>{metrica.detalhe}</p>
          </article>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 16 }}>
        {GRAFICOS.map((grafico) => (
          <figure key={grafico.arquivo} style={{ margin: 0, gridColumn: grafico.arquivo === "curvas_treino.png" ? "1 / -1" : undefined }}>
            <h4 style={{ margin: "0 0 6px" }}>{grafico.titulo}</h4>
            <img
              src={`/resultados/pele/${grafico.arquivo}`}
              alt={`${grafico.titulo} da reprodução do treino da Pele`}
              loading="lazy"
              style={{ display: "block", width: "100%", height: "auto", borderRadius: 8, background: "#fff" }}
            />
            <figcaption className="tiny muted" style={{ marginTop: 6 }}>
              {grafico.texto}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
