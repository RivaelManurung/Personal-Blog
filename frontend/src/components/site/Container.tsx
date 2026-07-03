import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "main" | "header" | "footer";
}

/** Centered editorial content column with responsive gutters. */
export function Container({ children, className, as: Tag = "div" }: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full max-w-[80rem] px-5 sm:px-8 lg:px-12", className)}>
      {children}
    </Tag>
  );
}
