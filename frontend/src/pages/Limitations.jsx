// Página de governança: limitações dos modelos, vazamento, viés, privacidade e créditos dos datasets.
import { PageHeader } from "../components/common";
import DatasetCredits from "../components/DatasetCredits";
import { DATASET_NOTES, SCOPE_WARNING } from "../utils/datasetNotes";
import Panel from "../components/Panel";

export default function Limitations() {
  return (
    <>
      <PageHeader
        label="GOVERNANÇA"
        title="Limitações, viés e uso responsável"
        description="O que os números da PixoraMed medem, o que eles não medem e por que este app não deve ser usado em pacientes."
      />
      <div className="stack">
        <Panel title="Não é um diagnóstico">
          <ul className="notes bullets">
            <li>
              Os modelos foram treinados com datasets públicos do Kaggle e nunca
              foram validados clinicamente.
            </li>
            <li>
              Em Oral e Cérebro, a saída é a classe mais provável entre as
              classes do treino. Uma imagem de outro tipo de exame recebe uma
              classe do mesmo jeito.
            </li>
            <li>{SCOPE_WARNING.brain}</li>
            <li>
              Em Oral e Cérebro, o resultado é "inconclusivo" quando a confiança
              fica abaixo de 80%. Isso reduz erros de baixa confiança, mas não
              impede erros com confiança alta, comuns em imagens de outra
              origem.
            </li>
            <li>
              Em Oral e Cérebro, a "confiança" exibida é a saída softmax da
              rede, não uma probabilidade calibrada de doença.
            </li>
            <li>
              Em Pele, a classe é "maligno" quando a probabilidade calibrada
              alcança o limiar de 18%. Na lista de análises, a confiança mostra
              a probabilidade da classe prevista, que pode ser baixa em um
              resultado "maligno". Quando nenhuma classe chega a 80%, a tela
              mantém a classe e mostra um aviso de baixa certeza.
            </li>
          </ul>
        </Panel>

        <Panel title="Vazamento entre treino e teste">
          <p className="text" style={{ margin: 0 }}>
            A documentação do Multi Cancer, usado em Oral e Cérebro, informa que
            as imagens foram aumentadas (rotação, deslocamento, zoom,
            espelhamento e brilho). Variações da mesma imagem podem cair no
            treino e no teste ao mesmo tempo, então a acurácia alta pode medir
            memorização, e não generalização para pacientes novos.
          </p>
        </Panel>

        <Panel title="O número honesto: pele">
          <p className="text">{DATASET_NOTES.skin}</p>
          <p className="text">
            A divisão por lesão (StratifiedGroupKFold por <code>lesion_id</code>
            ) impede que fotos da mesma lesão fiquem no treino e no teste. Redes
            pré-treinadas chegam a ~76% de acurácia balanceada no HAM10000;
            artigos com 95–98% costumam dividir por imagem.
          </p>
          <p className="text" style={{ margin: 0 }}>
            O modelo do app é outro: um ensemble de 5 EfficientNet-B0 que separa
            benigno (nevo, ceratose benigna, dermatofibroma e lesão vascular) de
            maligno (melanoma e carcinoma basocelular). Os dados foram separados
            por lesão, mas não por paciente. A queratose actínica (akiec) ficou
            fora do treino, então uma imagem dela recebe uma das duas classes. O
            limiar de 18% favorece encontrar casos malignos e aumenta os alarmes
            falsos. O modelo só vale para imagens dermatoscópicas, não para
            fotos comuns de celular.
          </p>
          <p className="text" style={{ margin: "12px 0 0" }}>
            O código original desse modelo foi perdido. Os resultados medidos
            pelo grupo (AUC de 0,939, sensibilidade de 89,0% e especificidade
            de 83,7%) são de uma reprodução do treino, não do modelo usado nas
            análises.
          </p>
        </Panel>

        <Panel title="Viés">
          <ul className="notes bullets">
            <li>
              O HAM10000 é muito desbalanceado (nevo ~67%, dermatofibroma ~1%).
              Os pesos por classe fazem a rede prever demais as classes raras.
            </li>
            <li>
              O desempenho em tons de pele pouco representados no dataset é
              desconhecido.
            </li>
            <li>
              Classes de fontes ou aparelhos diferentes permitem "atalhos": a
              rede pode aprender o aparelho, não a doença.
            </li>
          </ul>
        </Panel>

        <Panel title="Privacidade (LGPD)">
          <ul className="notes bullets">
            <li>
              A imagem enviada é processada em memória e descartada. O banco
              guarda só o modelo usado, a classe prevista, a confiança e o
              horário.
            </li>
            <li>
              Não envie imagens com nome, documento ou qualquer dado que
              identifique um paciente.
            </li>
          </ul>
        </Panel>

        <Panel title="Limitação técnica e trabalhos futuros">
          <p className="text">
            O protótipo não verifica se a imagem é compatível com o módulo
            escolhido. Ele foi pensado para uso por médicos, que escolhem o
            módulo e o exame corretos. Por isso, uma imagem sem relação, como um
            fundo ou um exame de outro tipo, também pode receber uma das classes
            do treino, e a confiança exibida não indica que o resultado seja
            válido.
          </p>
          <p className="text" style={{ margin: 0 }}>
            Como trabalho futuro, um filtro poderia recusar essas imagens antes
            da classificação, comparando-as com o padrão do treino ou usando um
            modelo que identifique o tipo de exame.
          </p>
        </Panel>

        <Panel title="Datasets e créditos">
          <DatasetCredits />
        </Panel>
      </div>
    </>
  );
}
