import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";

import { api } from "../api";
import { Alerta, CabecalhoPagina, Etapas } from "../components/Estrutura";
import Icone from "../components/Icone";
import { useEstado } from "../estado";
import { formatarTamanho, nomeModo, obterModulo } from "../modulos";

export default function Revisao() {
  const navegar = useNavigate();
  const queryClient = useQueryClient();
  const { analise, setUltimoResultado } = useEstado();
  const modelos = useQuery({ queryKey: ["modelos"], queryFn: api.modelos });

  const modulo = obterModulo(analise.moduloId);
  const modelo = modelos.data?.find((item) => item.id === analise.modeloId);

  const previsao = useMutation({
    mutationFn: () => api.prever(analise.modeloId, analise.arquivo!),
    onSuccess: (resultado) => {
      setUltimoResultado({
        ...resultado,
        criadoEm: new Date().toISOString(),
        codigoCaso: analise.codigoCaso.trim(),
        arquivoNome: analise.arquivo?.name ?? "",
        arquivoUrl: analise.arquivoUrl,
      });
      queryClient.invalidateQueries({ queryKey: ["previsoes"] });
      navegar(`/resultado/${resultado.id}`);
    },
  });

  if (!modulo || !analise.arquivo) return <Navigate to="/nova" replace />;

  return (
    <>
      <CabecalhoPagina
        rotulo="NOVA ANÁLISE"
        titulo="Revisar caso"
        descricao="Confirme o modelo e a imagem antes de executar a análise."
        acoes={
          <button
            type="button"
            className="btn secondary"
            onClick={() => navegar(`/analise/${modulo.id}`)}
          >
            Voltar e editar
          </button>
        }
      />
      <Etapas atual={2} />
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
            {analise.arquivoUrl && (
              <img src={analise.arquivoUrl} alt="Imagem selecionada" />
            )}
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
            <strong>{modulo.nome}</strong>
          </div>
          <div className="info-pair">
            <span>Exame</span>
            <strong>{modulo.exame}</strong>
          </div>
          <div className="info-pair">
            <span>Modelo</span>
            <strong>
              {modelo
                ? `${modelo.id} (${nomeModo(modelo.modo)})`
                : analise.modeloId}
            </strong>
          </div>
          <div className="info-pair">
            <span>Código do caso</span>
            <strong>{analise.codigoCaso.trim() || "Não informado"}</strong>
          </div>
          <div className="info-pair">
            <span>Arquivo</span>
            <strong>{analise.arquivo.name}</strong>
          </div>
          <div className="info-pair">
            <span>Tamanho</span>
            <strong>{formatarTamanho(analise.arquivo.size)}</strong>
          </div>
          <div style={{ marginTop: 15 }}>
            {previsao.isError ? (
              <Alerta icone="warning">
                <strong>A análise não foi concluída</strong>
                <br />
                {previsao.error.message}
              </Alerta>
            ) : (
              <Alerta>
                <strong>Ao executar</strong>
                <br />A imagem é enviada à API, passa pelo modelo e é
                descartada. O resultado fica registrado no histórico.
              </Alerta>
            )}
          </div>
          <button
            type="button"
            className="btn primary"
            style={{ width: "100%", marginTop: 15 }}
            disabled={previsao.isPending}
            onClick={() => previsao.mutate()}
          >
            {previsao.isPending ? "Analisando..." : "Executar análise"}{" "}
            <Icone nome="arrow" />
          </button>
        </section>
      </div>
    </>
  );
}
