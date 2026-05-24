import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * UNIQUE Button — BEM kökenli, Tailwind ile birleşik.
 *
 * Block:    .uq-button
 * Modifier: --primary | --secondary | --ghost | --destructive | --link
 * Size:     --size-sm | --size-lg | --size-icon  (default = md, gizli)
 *
 * Disabled state CSS pseudo ile değil, opacity-50 + pointer-events-none
 * ile uygulanır — BEM sınıfının dışında utility'ler eşlik eder.
 */
const buttonVariants = cva("uq-button", {
  variants: {
    variant: {
      default: "uq-button--primary",
      destructive: "uq-button--destructive",
      outline: "uq-button--secondary",
      secondary: "uq-button--secondary",
      ghost: "uq-button--ghost",
      link: "uq-button--link underline-offset-4 hover:underline text-primary",
    },
    size: {
      default: "",
      sm: "uq-button--size-sm",
      lg: "uq-button--size-lg",
      icon: "uq-button--size-icon",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
