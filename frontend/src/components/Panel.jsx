// Cartão de conteúdo das telas internas: título, descrição opcional, ações à direita e o conteúdo abaixo.
export default function Panel({ title, description, actions, as: Tag = "section", style, children }) {
  return (
    <Tag className="panel" style={style}>
      {(title || actions) && (
        <div className="panel-head">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </Tag>
  );
}
