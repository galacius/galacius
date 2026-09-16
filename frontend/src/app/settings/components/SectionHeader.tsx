import { FC } from "react";

interface SectionHeaderProps {
  title: string;
}

export const SectionHeader: FC<SectionHeaderProps> = ({ title }) => (
  <div className="flex h-14 shrink-0 items-center border-b px-6 py-3">
    <h2 className="text-sm font-semibold">{title}</h2>
  </div>
);
