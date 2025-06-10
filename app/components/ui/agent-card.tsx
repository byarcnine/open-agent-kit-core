import * as React from "react";

import { cn } from "~/lib/utils";

const AgentCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, onClick, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-white-80 backdrop-blur-xl rounded-2xl shadow-sm border p-2",
      className,
    )}
    {...props}
  />
));
AgentCard.displayName = "Card";

const AgentCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-2 p-4", className)}
    {...props}
  />
));
AgentCardHeader.displayName = "CardHeader";

const AgentCardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("leading-none tracking-tight text-md", className)}
    {...props}
  />
));
AgentCardTitle.displayName = "CardTitle";

const AgentCardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AgentCardDescription.displayName = "CardDescription";

const AgentCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-4 py-4 pt-0", className)} {...props} />
));
AgentCardContent.displayName = "CardContent";

const AgentCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
));
AgentCardFooter.displayName = "CardFooter";

export {
  AgentCard,
  AgentCardHeader,
  AgentCardFooter,
  AgentCardTitle,
  AgentCardDescription,
  AgentCardContent,
};
