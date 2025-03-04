import * as React from "react";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      rows={2}
      className={[
        "appearance-none outline-none shadow-none",
        "flex w-full rounded-md border border-input bg-transparent p-4 text-base md:text-sm transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      ].join(" ")}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
