import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/context/theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      position="top-right"
      closeButton={false}
      duration={4500}
      offset={16}
      gap={12}
      className="toaster group"
      {...props}
    />
  );
};

export { Toaster };
