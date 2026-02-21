import type { ComponentPropsWithoutRef } from "react";

import { ResourceHoverLink, type ResourceLike } from "@/components/skills/resource-link";
import { Separator } from "@/components/ui/separator";

export function createMarkdownComponents(options: {
  skillSlug: string;
  skillName?: string;
  findResourceByHref: (href: string) => ResourceLike | null;
}) {
  const { skillSlug, skillName, findResourceByHref } = options;

  return {
    h1: (props: ComponentPropsWithoutRef<"h1">) => (
      <h1 className="text-4xl font-semibold tracking-tight mt-8 mb-4 first:mt-0" {...props} />
    ),
    h2: (props: ComponentPropsWithoutRef<"h2">) => (
      <h2 className="text-2xl font-semibold tracking-tight mt-7 mb-3" {...props} />
    ),
    h3: (props: ComponentPropsWithoutRef<"h3">) => (
      <h3 className="text-xl font-medium mt-6 mb-2" {...props} />
    ),
    p: (props: ComponentPropsWithoutRef<"p">) => (
      <p className="text-sm text-foreground/95 leading-7 mb-4" {...props} />
    ),
    ul: (props: ComponentPropsWithoutRef<"ul">) => (
      <ul className="list-disc ml-6 space-y-2 text-sm mb-4" {...props} />
    ),
    ol: (props: ComponentPropsWithoutRef<"ol">) => (
      <ol className="list-decimal ml-6 space-y-2 text-sm mb-4" {...props} />
    ),
    li: (props: ComponentPropsWithoutRef<"li">) => <li className="leading-7" {...props} />,
    blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
      <blockquote
        className="border-l-2 border-primary/40 pl-4 italic text-muted-foreground my-4"
        {...props}
      />
    ),
    a: ({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">) => {
      const resource = findResourceByHref(href);

      if (resource) {
        return (
          <ResourceHoverLink resource={resource} skillSlug={skillSlug} skillName={skillName}>
            {children}
          </ResourceHoverLink>
        );
      }

      return (
        <a
          className="text-primary underline underline-offset-4"
          target="_blank"
          rel="noreferrer"
          href={href}
          {...props}
        >
          {children}
        </a>
      );
    },
    table: (props: ComponentPropsWithoutRef<"table">) => (
      <div className="overflow-x-auto border border-border my-4">
        <table className="w-full text-sm" {...props} />
      </div>
    ),
    th: (props: ComponentPropsWithoutRef<"th">) => (
      <th className="border-b border-border bg-secondary/50 p-2 text-left font-medium" {...props} />
    ),
    td: (props: ComponentPropsWithoutRef<"td">) => (
      <td className="border-b border-border p-2 align-top" {...props} />
    ),
    code: ({ className, children, ...props }: ComponentPropsWithoutRef<"code">) => {
      const text = String(children ?? "");
      const isBlock = className?.includes("language-") || text.includes("\n");

      if (!isBlock) {
        return (
          <code className="bg-secondary px-1.5 py-0.5 text-xs rounded-none" {...props}>
            {children}
          </code>
        );
      }

      return (
        <code
          className={[
            "block bg-secondary/40 border border-border p-3 text-xs leading-6 overflow-x-auto rounded-none",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        >
          {children}
        </code>
      );
    },
    hr: () => <Separator className="my-6" />,
  };
}
