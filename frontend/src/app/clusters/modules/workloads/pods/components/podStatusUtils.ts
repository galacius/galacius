export function execStatusDotClass(status: string): string {
  switch (status) {
    case "connecting":
      return "bg-warning";
    case "active":
      return "bg-success";
    case "error":
      return "bg-destructive";
    default:
      return "bg-muted-foreground";
  }
}

export function statusDotClass(status: string): string {
  switch (status) {
    case "connecting":
      return "bg-warning";
    case "streaming":
      return "bg-success";
    case "error":
      return "bg-destructive";
    default:
      return "bg-muted-foreground";
  }
}

export function containerDotColorClass(status: string, ready: boolean): string | null {
  switch (status.toLowerCase()) {
    case "running":
      return "bg-success";
    case "waiting":
      return "bg-danger";
    case "terminated":
      return ready ? "bg-success" : "bg-destructive";
    default:
      return null;
  }
}
