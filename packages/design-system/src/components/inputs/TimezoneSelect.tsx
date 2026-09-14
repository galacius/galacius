import { FC, useMemo, useState } from "react";
import { SearchIcon } from "../../atoms/icon";
import { Input } from "../../atoms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../atoms/select";

const TIMEZONES: string[] = Intl.supportedValuesOf("timeZone");

interface TimezoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
  "aria-labelledby"?: string;
}

export const TimezoneSelect: FC<TimezoneSelectProps> = ({
  value,
  onChange,
  "aria-labelledby": ariaLabelledBy,
}) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      search.trim()
        ? TIMEZONES.filter((tz) => tz.toLowerCase().includes(search.toLowerCase()))
        : TIMEZONES,
    [search]
  );

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
      onOpenChange={(open) => {
        if (!open) setSearch("");
      }}
    >
      <SelectTrigger aria-labelledby={ariaLabelledBy} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        <div className="sticky top-0 z-10 border-b bg-popover p-1.5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search timezone…"
              className="pl-8 text-sm"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">No timezone found.</p>
        ) : (
          filtered.map((tz) => (
            <SelectItem key={tz} value={tz}>
              {tz}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};
