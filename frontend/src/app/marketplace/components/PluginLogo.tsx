import { cn, PlugIcon } from "@galacius/design-system";
import { FC, useState } from "react";

const PluginLogoFallback: FC<{ size: string; overlay?: boolean }> = ({ size, overlay }) => (
  <div
    aria-hidden
    className={cn(
      "flex items-center justify-center rounded-md bg-stone-600",
      overlay ? "absolute inset-0" : cn("shrink-0", size)
    )}
  >
    <PlugIcon className="size-4 text-muted-foreground" />
  </div>
);

export const PluginLogo: FC<{ src?: string; alt: string; size?: string }> = ({
  src,
  alt,
  size = "size-8",
}) => {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || errored) {
    return <PluginLogoFallback size={size} />;
  }

  return (
    <div className={cn("relative rounded-md bg-white p-1", size)}>
      {!loaded && <PluginLogoFallback size={size} overlay />}
      <img
        src={src}
        alt={alt}
        className={cn(
          "size-full object-contain opacity-0 transition-opacity duration-150",
          loaded && "opacity-100"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </div>
  );
};
