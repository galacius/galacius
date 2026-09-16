import { useEffect, useRef, useState } from "react";

export function useCopyToClipboard<T = true>(timeout = 1500) {
  const [copiedValue, setCopiedValue] = useState<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copy = (text: string, marker: T = true as unknown as T) => {
    navigator.clipboard.writeText(text).then(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCopiedValue(marker);
      timerRef.current = setTimeout(() => setCopiedValue(null), timeout);
    });
  };

  return { copiedValue, copy };
}
