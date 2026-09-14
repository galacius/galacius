import { ResourceExplanationTooltip, SearchInput } from "@galacius/design-system";
import { FC, useState } from "react";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { EventsTable } from "./components/EventsTable";
import { useGetEvents } from "./hooks/data-access/useGetEvents";

export const EventsView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const { activeContext, namespaces } = useMainLayoutContext();
  const [search, setSearch] = useState("");

  const { data: raw = [], isLoading } = useGetEvents({ context: activeContext, namespaces });

  const q = search.toLowerCase();
  const events = raw
    .filter(
      (e) =>
        q === "" ||
        e.Message.toLowerCase().includes(q) ||
        e.InvolvedObjectKind.toLowerCase().includes(q) ||
        e.InvolvedObjectName.toLowerCase().includes(q) ||
        e.Namespace.toLowerCase().includes(q)
    )
    .toSorted((a, b) => b.CreatedAt - a.CreatedAt);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Events</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          description="An Event records what's happening inside the cluster, such as scheduling decisions, container failures, or scaling actions."
          docsUrl="https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1"
        />
        <span className="text-xs text-muted-foreground">
          {events.length} item{events.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <SearchInput
            placeholder="Search Events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="w-68"
          />
        </div>
      </div>

      <EventsTable events={events} isLoading={isLoading} />
    </div>
  );
};
