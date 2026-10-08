interface Props<T extends string> {
  value: T
  onChange: (value: T) => void
  items: { value: T; label: string }[]
  label: string
}

export function Tabs<T extends string>({ value, onChange, items, label }: Props<T>) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          className="tab"
          aria-selected={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
