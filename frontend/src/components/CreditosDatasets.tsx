const DATASETS = [
  {
    nome: "Multi Cancer Dataset",
    autor: "Obuli Sai Naren",
    uso: "Cérebro, Colo do útero, Cólon, Linfoma, Mama, Oral, Pulmão e Rim",
    kaggle: "https://www.kaggle.com/datasets/obulisainaren/multi-cancer",
    citacoes: [
      {
        texto: "Obuli Sai Naren. (2022). Multi Cancer Dataset [Data set]. Kaggle.",
        doi: "https://doi.org/10.34740/KAGGLE/DSV/3415848",
      },
    ],
  },
  {
    nome: "Skin Cancer MNIST: HAM10000",
    autor: "publicado no Kaggle por K Scott Mader",
    uso: "Pele",
    kaggle: "https://www.kaggle.com/datasets/kmader/skin-cancer-mnist-ham10000",
    citacoes: [
      {
        texto:
          "Tschandl, P., Rosendahl, C. & Kittler, H. (2018). The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions. Scientific Data, 5, 180161.",
        doi: "https://doi.org/10.1038/sdata.2018.161",
      },
    ],
  },
];

export default function CreditosDatasets() {
  return (
    <>
      <ul className="notas">
        {DATASETS.map((dataset) => (
          <li key={dataset.nome}>
            <strong>{dataset.nome}</strong> ({dataset.autor}). Usado em: {dataset.uso}.{" "}
            <a className="text-link" href={dataset.kaggle} target="_blank" rel="noreferrer">
              Ver no Kaggle
            </a>
            {dataset.citacoes.map((citacao) => (
              <div key={citacao.doi} className="citacao">
                {citacao.texto}{" "}
                <a className="text-link" href={citacao.doi} target="_blank" rel="noreferrer">
                  {citacao.doi}
                </a>
              </div>
            ))}
          </li>
        ))}
      </ul>
      <p className="texto" style={{ margin: "12px 0 0" }}>
        Os dois datasets têm licença{" "}
        <a className="text-link" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
          CC BY-NC-SA 4.0
        </a>{" "}
        (com crédito, sem uso comercial e com compartilhamento pela mesma licença). As imagens foram reduzidas para 128×128; no Multi
        Cancer, usamos 1000 imagens por classe.
      </p>
    </>
  );
}
