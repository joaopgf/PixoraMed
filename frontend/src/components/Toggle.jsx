// Botões de alternância entre opções (ex.: Acurácia / F1 macro). options: [{ value, name }].
export default function Toggle({ options, current, onChange, label, style }) {
  return (
    <div className="seg" role="group" aria-label={label} style={style}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={current === option.value ? "active" : ""}
          aria-pressed={current === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}
