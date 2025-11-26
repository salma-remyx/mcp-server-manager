/**
 * Mimics gemini-cli's useTerminalSize hook to track terminal dimensions.
 */
import { useEffect, useState } from "react";
import { useStdout } from "ink";

interface TerminalSize {
  columns: number;
  rows: number;
}

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState<TerminalSize>({
    columns: stdout?.columns || 60,
    rows: stdout?.rows || 20,
  });

  useEffect(() => {
    if (!stdout) return;

    const updateSize = (): void => {
      setSize({
        columns: stdout.columns || 60,
        rows: stdout.rows || 20,
      });
    };

    stdout.on("resize", updateSize);
    // Ensure we update immediately in case dimensions changed
    updateSize();
    return (): void => {
      stdout.off("resize", updateSize);
    };
  }, [stdout]);

  return size;
}
