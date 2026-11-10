// Créditos e licenças dos datasets públicos usados no treino (exigidos pelas licenças CC BY-NC-SA).
const DATASETS = [
  {
    name: "Multi Cancer Dataset",
    author: "Obuli Sai Naren",
    usedIn: "Oral e Cérebro",
    kaggle: "https://www.kaggle.com/datasets/obulisainaren/multi-cancer",
    citation:
      "Obuli Sai Naren. (2022). Multi Cancer Dataset [Data set]. Kaggle.",
    doi: "https://doi.org/10.34740/KAGGLE/DSV/3415848",
  },
  {
    name: "Skin Cancer MNIST: HAM10000",
    author: "publicado no Kaggle por K Scott Mader",
    usedIn: "Pele",
    kaggle: "https://www.kaggle.com/datasets/kmader/skin-cancer-mnist-ham10000",
    citation:
      "Tschandl, P., Rosendahl, C. & Kittler, H. (2018). The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions. Scientific Data, 5, 180161.",
    doi: "https://doi.org/10.1038/sdata.2018.161",
  },
];

export default function DatasetCredits() {
  return (
    <>
      <ul className="notes">
        {DATASETS.map((dataset) => (
          <li key={dataset.name}>
            <strong>{dataset.name}</strong> ({dataset.author}). Usado em:{" "}
            {dataset.usedIn}.{" "}
            <a className="text-link" href={dataset.kaggle} target="_blank" rel="noreferrer">
              Ver no Kaggle
            </a>
            <div className="citation">
              {dataset.citation}{" "}
              <a className="text-link" href={dataset.doi} target="_blank" rel="noreferrer">
                {dataset.doi}
              </a>
            </div>
          </li>
        ))}
      </ul>
      <p className="text" style={{ margin: "12px 0 0" }}>
        Os dois datasets têm licença{" "}
        <a
          className="text-link"
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-NC-SA 4.0
        </a>{" "}
        (com crédito, sem uso comercial e com compartilhamento pela mesma
        licença). As imagens foram reduzidas para 128×128; no Multi Cancer,
        usamos só uma parte das imagens de cada classe.
      </p>
    </>
  );
}
