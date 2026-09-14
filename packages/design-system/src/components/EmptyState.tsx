import { FC, ReactNode } from "react";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-12">
    <div className="text-muted-foreground">{icon}</div>
    <h3 className="text-h3">{title}</h3>
    {description && <p className="text-caption text-muted-foreground">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
