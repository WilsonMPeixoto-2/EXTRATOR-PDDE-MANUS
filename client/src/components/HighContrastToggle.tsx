import { Contrast } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function HighContrastToggle() {
  const { highContrast, toggleHighContrast } = useTheme();

  return <button
    type="button"
    className="contrast-toggle"
    aria-pressed={highContrast}
    onClick={toggleHighContrast}
  >
    <Contrast size={15} aria-hidden="true" />
    {highContrast ? "Contraste padrão" : "Alto contraste"}
  </button>;
}
