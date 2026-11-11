// Área para arrastar ou escolher a imagem do exame. Confere tipo e tamanho e devolve o arquivo ou a mensagem de erro.
import { useState } from "react";

import Icon from "./Icon";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function ImageDropzone({ id, maxMb = 10, onFile, onError }) {
  const [dragging, setDragging] = useState(false);

  function choose(file) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type))
      return onError("Formato não suportado. Selecione PNG, JPG ou WEBP.");
    if (file.size > maxMb * 1024 * 1024)
      return onError(`O arquivo passa do limite de ${maxMb} MB.`);
    onError("");
    onFile(file);
  }

  return (
    <label
      className={`dropzone${dragging ? " dragover" : ""}`}
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        choose(event.dataTransfer.files[0]);
      }}
    >
      <input
        id={id}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        hidden
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <span className="upload-symbol">
        <Icon name="upload" />
      </span>
      <strong>Arraste sua imagem até aqui</strong>
      <span>ou clique para selecionar um arquivo</span>
      <small>PNG, JPG ou WEBP · até {maxMb} MB</small>
    </label>
  );
}
