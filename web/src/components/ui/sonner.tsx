import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
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
