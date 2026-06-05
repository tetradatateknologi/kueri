import { ChevronsUpDown, GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof Group>) => (
  <Group
    className={cn("flex h-full w-full aria-[orientation=vertical]:flex-col", className)}
    {...props}
  />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) => (
  <Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 aria-[orientation=vertical]:cursor-col-resize aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-3 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 [&[aria-orientation=horizontal]>div]:absolute [&[aria-orientation=horizontal]>div]:left-1/2 [&[aria-orientation=horizontal]>div]:top-1/2 [&[aria-orientation=horizontal]>div]:h-5 [&[aria-orientation=horizontal]>div]:w-10 [&[aria-orientation=horizontal]>div]:-translate-x-1/2 [&[aria-orientation=horizontal]>div]:-translate-y-1/2 [&[aria-orientation=horizontal]>div>.handle-icon-col]:hidden [&[aria-orientation=horizontal]>div>.handle-icon-row]:block",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-10 w-5 items-center justify-center rounded-md border bg-border shadow-sm transition-colors hover:bg-muted">
        <GripVertical className="handle-icon-col h-4 w-4 text-muted-foreground" />
        <ChevronsUpDown className="handle-icon-row hidden h-4 w-4 text-muted-foreground" />
      </div>
    )}
  </Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
