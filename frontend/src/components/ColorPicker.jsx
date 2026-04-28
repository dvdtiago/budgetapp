const PALETTE = [
  // Pastels
  '#fca5a5', '#fdba74', '#fcd34d', '#fde68a', '#d9f99d',
  '#86efac', '#6ee7b7', '#67e8f9', '#7dd3fc', '#93c5fd',
  '#a5b4fc', '#c4b5fd', '#f0abfc', '#f9a8d4', '#d4d4d4',
  // Bold
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#d946ef', '#ec4899', '#14b8a6', '#6b7280',
];

export default function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {PALETTE.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          title={color}
          className={`w-6 h-6 rounded-full transition-transform hover:scale-110 shrink-0 ${
            value === color
              ? 'ring-2 ring-offset-2 ring-neutral-600 dark:ring-neutral-300 scale-110'
              : ''
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
