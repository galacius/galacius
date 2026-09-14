// Explicit allowlist, not `export *` — several lucide-react icon names collide with
// existing shadcn atom/component exports (e.g. Badge, Sheet, Table, Donut).
export {
  AppWindowIcon,
  ArrowLeftRightIcon,
  ArrowUpCircleIcon,
  ArrowUpIcon,
  BellIcon,
  BoxesIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  CircleXIcon,
  ClockIcon,
  ContainerIcon,
  CopyIcon,
  CornerDownLeftIcon,
  CpuIcon,
  DatabaseIcon,
  DownloadIcon,
  DropletIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  FolderOpenIcon,
  FolderSyncIcon,
  FrownIcon,
  GaugeIcon,
  HardDriveIcon,
  HouseIcon,
  InfoIcon,
  KeyIcon,
  LayersIcon,
  LayoutDashboardIcon,
  Link2Icon,
  ListChecksIcon,
  Loader2Icon,
  LockIcon,
  LockOpenIcon,
  Maximize2Icon,
  Minimize2Icon,
  MinusIcon,
  MoreVerticalIcon,
  NetworkIcon,
  OctagonXIcon,
  PackageIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlugIcon,
  PlusIcon,
  RefreshCwIcon,
  RocketIcon,
  RotateCcwIcon,
  RouteIcon,
  SaveIcon,
  ScalingIcon,
  ScrollTextIcon,
  SearchIcon,
  ServerIcon,
  Settings2Icon,
  SettingsIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShipWheelIcon,
  SlidersHorizontalIcon,
  SquareIcon,
  StarIcon,
  TerminalIcon,
  TimerIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UserRoundIcon,
  WebhookIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import type { SVGProps } from "react";

// Platform brand marks — not part of lucide-react, hand-drawn to match its 24x24/currentColor conventions.
function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.037 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zm3.011-2.598c.833-1.012 1.395-2.42 1.24-3.828-1.202.052-2.649.805-3.507 1.817-.766.896-1.443 2.338-1.263 3.714 1.34.104 2.706-.688 3.53-1.703z" />
    </svg>
  );
}

function WindowsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3 5.557 10.5 4.5v7H3V5.557Zm8.25-1.164L21 3v8.5h-9.75v-7.107ZM3 12.5h7.5v7L3 18.443V12.5Zm8.25 0H21V21l-9.75-1.35V12.5Z" />
    </svg>
  );
}

function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

function LinuxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <g>
        {/* splayed feet */}
        <path d="M6.6 19.6c-1.4.5-2.9 1.5-3.4 2.6-.3.7.2 1.3.9 1.1 1.6-.4 3.4-1.4 4.4-2.6.5-.6.2-1.5-.5-1.7-.5-.1-1 0-1.4.6Z" />
        <path d="M17.4 19.6c1.4.5 2.9 1.5 3.4 2.6.3.7-.2 1.3-.9 1.1-1.6-.4-3.4-1.4-4.4-2.6-.5-.6-.2-1.5.5-1.7.5-.1 1 0 1.4.6Z" />
        {/* flipper */}
        <path d="M16.2 10.5c1 1.3 1.7 2.9 2 4.5.5-.5.8-1.2.8-2 0-1.6-1.1-3-2.5-3.4-.2.3-.2.6-.3.9Z" />
        {/* beak, protruding past the head outline */}
        <path d="M13.6 9.4c.9-.1 1.9.1 2.7.6.4.3.3.9-.2 1-1 .2-2.1.1-2.9-.4-.4-.2-.4-.8-.1-1 .2-.1.3-.2.5-.2Z" />
        {/* body + head, with eyes cut out as transparent holes */}
        <path
          fillRule="evenodd"
          d="M12 2c-2.3 0-3.9 2-3.8 4.6.1 1.4.6 2.1-.5 3.4-2.1 2.5-2.8 5.9-2.4 8.7.2 1.1 1.5 1.5 2.3.7l.6-.6c.9 1.6 2.4 2.4 3.8 2.4s2.9-.8 3.8-2.4l.6.6c.8.8 2.1.4 2.3-.7.4-2.8-.3-6.2-2.4-8.7-1.1-1.3-.6-2-.5-3.4C15.9 4 14.3 2 12 2Zm-1.7 5.6a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm3.4 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"
        />
      </g>
    </svg>
  );
}

export { AppleIcon, GithubIcon, LinuxIcon, WindowsIcon };
