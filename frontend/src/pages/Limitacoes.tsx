import CreditosDatasets from "../components/CreditosDatasets";
import { CabecalhoPagina } from "../components/Estrutura";
import { NOTAS_DATASET } from "../dados";

export default function Limitacoes() {
  return (
    <>
      <CabecalhoPagina
        rotulo="GOVERNANÇA"
        titulo="Limitações, viés e uso responsável"
        descricao="O que os números da PixoraMed medem, o que eles não medem e por que este app não deve ser usado em pacientes."
      />
      <div className="stack">
        <section className="panel">
          <div className="panel-head">
            <h3>Não é um diagnóstico</h3>
          </div>
          <ul className="notas bullets">
            <li>Os modelos foram treinados com datasets públicos do Kaggle e nunca foram validados clinicamente.</li>
            <li>A saída é a classe mais provável entre as classes do treino. Uma imagem de outro tipo de exame recebe uma classe do mesmo jeito.</li>
            <li>A "confiança" exibida é a saída softmax da rede, não uma probabilidade calibrada de doença.</li>
            <li>O modelo do app usa a configuração avaliada em 5 folds, treinada com todas as imagens. Ele não tem nota própria, porque não sobrou imagem para testá-lo.</li>
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Vazamento entre treino e teste</h3>
          </div>
          <p className="texto" style={{ margin: 0 }}>
            A documentação do Multi Cancer, usado em Oral e Cérebro, informa que as imagens foram aumentadas (rotação, deslocamento, zoom,
            espelhamento e brilho). Variações da mesma imagem podem cair no treino e no teste ao mesmo tempo, então a acurácia alta pode
            medir memorização, e não generalização para pacientes novos.
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>O número honesto: pele</h3>
          </div>
          <p className="texto">{NOTAS_DATASET.Pele}</p>
          <p className="texto" style={{ margin: 0 }}>
            A divisão por lesão (StratifiedGroupKFold por <code>lesion_id</code>) impede que fotos da mesma lesão fiquem no treino e no
            teste. Redes pré-treinadas chegam a ~76% de acurácia balanceada no HAM10000; artigos com 95–98% costumam dividir por imagem.
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Viés</h3>
          </div>
          <ul className="notas bullets">
            <li>O HAM10000 é muito desbalanceado (nevo ~67%, dermatofibroma ~1%). Os pesos por classe fazem a rede prever demais as classes raras.</li>
            <li>O desempenho em tons de pele pouco representados no dataset é desconhecido.</li>
            <li>Classes de fontes ou aparelhos diferentes permitem "atalhos": a rede pode aprender o aparelho, não a doença.</li>
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Privacidade (LGPD)</h3>
          </div>
          <ul className="notas bullets">
            <li>A imagem enviada é processada em memória e descartada. O banco guarda só o modelo usado, a classe prevista, a confiança e o horário.</li>
            <li>Não envie imagens com nome, documento ou qualquer dado que identifique um paciente.</li>
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Limitação técnica e trabalhos futuros</h3>
          </div>
          <p className="texto">
            O protótipo não verifica se a imagem é compatível com o módulo escolhido. Ele foi pensado para uso por médicos, que escolhem o
            módulo e o exame corretos. Por isso, uma imagem sem relação, como um fundo ou um exame de outro tipo, também recebe uma das
            classes do treino, e a confiança exibida não indica que o resultado seja válido.
          </p>
          <p className="texto" style={{ margin: 0 }}>
            Como trabalho futuro, um filtro poderia recusar essas imagens antes da classificação, comparando-as com o padrão do treino ou
            usando um modelo que identifique o tipo de exame.
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Datasets e créditos</h3>
          </div>
          <CreditosDatasets />
        </section>
      </div>
    </>
  );
}
