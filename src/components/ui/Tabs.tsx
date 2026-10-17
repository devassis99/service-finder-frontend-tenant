interface TabsProps<T extends string> {
  tabs: ReadonlyArray<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/**
 * B01's density switch, turned to a page's sub-views ("Members / Roles"):
 * a sunken track with the selected option lifted onto a light chip.
 */
export function Tabs<T extends string>({ tabs, value, onChange, label }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex w-fit gap-1 rounded-[11px] bg-tn-neutral-bg p-[3px]"
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 px-3.5 py-2 font-sans text-[13px] leading-none ${
              active
                ? "bg-tn-paper font-semibold text-tn-ink shadow-[0_1px_2px_rgb(20_18_12/0.08)]"
                : "bg-transparent font-medium text-tn-muted hover:text-tn-ink"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="font-mono text-[10px] leading-none text-tn-faint">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
