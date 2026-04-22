interface DateSelectorProps {
  /** 선택 가능한 날짜 목록. 길이 1 이면 읽기 전용 레이블로 렌더. */
  dates: readonly string[];
  selectedDate: string;
  onChange: (date: string) => void;
}

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export function DateSelector({ dates, selectedDate, onChange }: DateSelectorProps) {
  if (dates.length === 0) return null;

  if (dates.length === 1) {
    return (
      <div className="inline-flex items-center rounded-full bg-background/90 px-3 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur">
        {formatDateLabel(dates[0])}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-background/90 p-1 shadow-sm backdrop-blur">
      {dates.map((d) => {
        const active = d === selectedDate;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            aria-pressed={active}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {formatDateLabel(d)}
          </button>
        );
      })}
    </div>
  );
}
