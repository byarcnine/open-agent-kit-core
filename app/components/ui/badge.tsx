import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-xl border px-2.5 py-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground hover:bg-primary-foreground",
      },
      disabled: {
        true: "pointer-events-none hover:bg-inherit",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      disabled: false,
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  disabled?: boolean;
}

function Badge({ className, variant, disabled = false, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, disabled }), className)}
      aria-disabled={disabled}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
