import { Cartao } from "../components/Cartao";
import { NOTAS_DATASET, SUSPEITA_VAZAMENTO } from "../dados";

export default function Limitacoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Limitações, viés e uso responsável</h1>
        <p className="mt-1 text-sm text-slate-600">
          O que os números do PixoraMed medem, o que eles não medem e por que este app não deve ser usado em pacientes.
        </p>
      </div>

      <Cartao titulo="Não é um diagnóstico">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>O modelo foi treinado com datasets públicos do Kaggle e nunca foi validado clinicamente.</li>
          <li>A saída é a classe mais provável entre as classes do treino. Uma imagem de outro tipo de exame recebe uma classe do mesmo jeito.</li>
          <li>A "confiança" exibida é a saída softmax da rede, não uma probabilidade calibrada de doença.</li>
        </ul>
      </Cartao>

      <Cartao titulo="Vazamento entre treino e teste">
        <p className="mb-3 text-sm text-slate-700">
          Nos datasets abaixo, cópias ou quase-cópias da mesma imagem podem cair no treino e no teste ao mesmo tempo. A
          acurácia alta mede memorização, não generalização para pacientes novos.
        </p>
        <ul className="space-y-2 text-sm text-slate-700">
          {Object.entries(SUSPEITA_VAZAMENTO).map(([cancer, nota]) => (
            <li key={cancer}>
              <span className="font-medium">{cancer}:</span> {nota}
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao titulo="O número honesto: pele">
        <p className="text-sm text-slate-700">{NOTAS_DATASET.Pele}</p>
        <p className="mt-2 text-sm text-slate-700">
          A divisão por lesão (StratifiedGroupKFold por <code>lesion_id</code>) impede que fotos da mesma lesão fiquem
          no treino e no teste. Redes pré-treinadas chegam a ~76% de acurácia balanceada no HAM10000; artigos com 95–98%
          costumam dividir por imagem.
        </p>
      </Cartao>

      <Cartao titulo="Viés">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>HAM10000 é muito desbalanceado (nevo ~67%, dermatofibroma ~1%). Os pesos por classe fazem a rede prever demais as classes raras.</li>
          <li>As imagens de pele vêm de poucas clínicas e são, em sua maioria, de peles claras. O desempenho em outros tons de pele é desconhecido.</li>
          <li>Classes de fontes ou aparelhos diferentes permitem "atalhos": a rede pode aprender o aparelho, não a doença.</li>
        </ul>
      </Cartao>

      <Cartao titulo="Privacidade (LGPD)">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>A imagem enviada é processada em memória e descartada. O banco guarda só o modelo usado, a classe prevista, a confiança e o horário.</li>
          <li>Não envie imagens com nome, documento ou qualquer dado que identifique um paciente.</li>
        </ul>
      </Cartao>
    </div>
  );
}
