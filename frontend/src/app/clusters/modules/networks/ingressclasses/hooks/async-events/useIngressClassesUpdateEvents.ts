import { startTransition, useEffect, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import type { IngressClass } from "../../api/resources";

export function useIngressClassesUpdateEvents(): IngressClass[] {
  const [latestIngressClasses, setLatestIngressClasses] = useState<IngressClass[]>([]);
  useEffect(() => {
    return EventsOn("ingressclasses:update", (data: IngressClass[]) => {
      startTransition(() => {
        setLatestIngressClasses(data);
      });
    });
  }, []);
  return latestIngressClasses;
}
