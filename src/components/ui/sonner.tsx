import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          // Calm error style: soft amber surface and steady icon, no red, no shake.
          error:
            "group-[.toaster]:!bg-[color-mix(in_srgb,hsl(var(--warning))_12%,hsl(var(--card)))] group-[.toaster]:!text-foreground group-[.toaster]:!border-warning/40 [&_[data-icon]]:!text-warning",
          warning:
            "group-[.toaster]:!bg-[color-mix(in_srgb,hsl(var(--warning))_12%,hsl(var(--card)))] group-[.toaster]:!text-foreground group-[.toaster]:!border-warning/40 [&_[data-icon]]:!text-warning",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
