import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import { Alerta, CabecalhoPagina } from "../components/Estrutura";
import Icone from "../components/Icone";
import { MODULOS, modelosDoModulo } from "../modulos";

export default function Catalogo() {
  const navegar = useNavigate();
  const modelos = useQuery({ queryKey: ["modelos"], queryFn: api.modelos });

  return (
    <>
      <CabecalhoPagina
        rotulo="CATÁLOGO"
        titulo="Módulos de análise"
        descricao="Cada módulo envia a imagem para o modelo treinado só para aquele tipo de exame."
        acoes={
          <button
            type="button"
            className="btn secondary"
            onClick={() => navegar("/modelos")}
          >
            <Icone nome="layers" /> Ver status técnico
          </button>
        }
      />
      <div style={{ marginBottom: 16 }}>
        <Alerta tipo="info">
          <strong>Use o módulo certo para cada imagem.</strong>
          <br />O modelo sempre responde com uma das classes do treino, mesmo se
          receber uma imagem de outro tipo de exame.
        </Alerta>
      </div>
      {modelos.isLoading && (
        <div style={{ marginBottom: 16 }}>
          <Alerta tipo="info">
            Conectando ao serviço de IA. Depois de um tempo sem uso, ele leva
            até 1 minuto para responder.
          </Alerta>
        </div>
      )}
      {modelos.isError && (
        <div style={{ marginBottom: 16 }}>
          <Alerta>
            Não foi possível falar com a API: {modelos.error.message}
          </Alerta>
        </div>
      )}
      <div className="module-list-grid">
        {MODULOS.map((modulo) => {
          const conectado = modelosDoModulo(modulo, modelos.data).length > 0;
          return (
            <button
              key={modulo.id}
              type="button"
              className="module-tile"
              onClick={() => navegar(`/analise/${modulo.id}`)}
            >
              <span className="module-icon">
                <Icone nome={modulo.icone} />
              </span>
              <span className="module-tile-copy">
                <strong>{modulo.nome}</strong>
                <small>
                  {modulo.exame} · {modulo.area}
                </small>
                <span className={`status-mini${conectado ? " on" : ""}`}>
                  {modelos.isLoading
                    ? "CONECTANDO..."
                    : conectado
                      ? "MODELO CONECTADO"
                      : "MODELO NÃO CONECTADO"}
                </span>
              </span>
              <Icone nome="chevron" />
            </button>
          );
        })}
      </div>
    </>
  );
}
