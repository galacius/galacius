import { createContext, FC, ReactNode, use, useMemo } from "react";
import { DetailDrawerProvider } from "./shared/components/details/DetailDrawerContext";
import { UnifiedTrayProvider } from "./shared/components/trays/unified/UnifiedTrayContext";

interface MainLayoutContextValue {
  activeContext: string;
  activeResource: string;
  namespaces: string[];
  onNamespacesChange: (ns: string[]) => void;
  onNavigateToView: (view: string) => void;
}

const MainLayoutCtx = createContext<MainLayoutContextValue | null>(null);

export const useMainLayoutContext = (): MainLayoutContextValue => {
  const ctx = use(MainLayoutCtx);
  if (!ctx) throw new Error("useMainLayoutContext must be used inside MainLayoutProvider");
  return ctx;
};

interface MainLayoutProviderProps {
  children: ReactNode;
  className?: string;
  activeContext: string;
  activeResource: string;
  namespaces: string[];
  onNamespacesChange: (ns: string[]) => void;
  onNavigateToView: (view: string) => void;
}

export const MainLayoutProvider: FC<MainLayoutProviderProps> = ({
  children,
  className,
  activeContext,
  activeResource,
  namespaces,
  onNamespacesChange,
  onNavigateToView,
}) => {
  const ctxValue = useMemo<MainLayoutContextValue>(
    () => ({
      activeContext,
      activeResource,
      namespaces,
      onNamespacesChange,
      onNavigateToView,
    }),
    [activeContext, activeResource, namespaces, onNamespacesChange, onNavigateToView]
  );

  return (
    <MainLayoutCtx.Provider value={ctxValue}>
      <DetailDrawerProvider>
        <UnifiedTrayProvider>
          <div className={className}>{children}</div>
        </UnifiedTrayProvider>
      </DetailDrawerProvider>
    </MainLayoutCtx.Provider>
  );
};
