import { FC, useMemo, useState } from "react";
import { SearchIcon } from "../../atoms/icon";
import { Input } from "../../atoms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../atoms/select";

interface NameSpaceSelectDropdownProps {
  namespaces: string[];
  value: string;
  onChange: (namespace: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  positionerClassName?: string;
  "aria-labelledby"?: string;
}

export const NameSpaceSelectDropdown: FC<NameSpaceSelectDropdownProps> = ({
  namespaces,
  value,
  onChange,
  disabled = false,
  placeholder = "Select namespace",
  className,
  positionerClassName,
  "aria-labelledby": ariaLabelledBy,
}) => {
  const [search, setSearch] = useState("");

  const sortedNamespaces = useMemo(
    () => namespaces.slice().sort((a, b) => a.localeCompare(b)),
    [namespaces]
  );

  const filtered = useMemo(
    () =>
      search.trim()
        ? sortedNamespaces.filter((ns) => ns.toLowerCase().includes(search.toLowerCase()))
        : sortedNamespaces,
    [sortedNamespaces, search]
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
      disabled={disabled}
    >
      <SelectTrigger aria-labelledby={ariaLabelledBy} aria-label="Namespace" className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        positionerClassName={positionerClassName}
        className="max-h-72"
      >
        <div className="sticky top-0 z-10 border-b bg-popover p-1.5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search namespace…"
              className="pl-8 text-sm"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">No namespace found.</p>
        ) : (
          filtered.map((ns) => (
            <SelectItem key={ns} value={ns}>
              {ns}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};
