import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  width?: "default" | "wide" | "full";
  className?: string;
  contentClassName?: string;
};

export function AppShell({
  children,
  width = "default",
  className = "",
  contentClassName = "",
}: AppShellProps) {
  const widthClass =
    width === "wide"
      ? "max-w-[1280px]"
      : width === "full"
        ? "max-w-none"
        : "max-w-6xl";

  return (
    <main className={`app-shell ${className}`.trim()}>
      <div
        className={`mx-auto w-full px-5 py-8 md:px-8 md:py-10 ${widthClass} ${contentClassName}`.trim()}
      >
        {children}
      </div>
    </main>
  );
}
