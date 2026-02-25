"use client";

import type { MouseEvent } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type DownloadContentButtonProps = {
  content: string;
  fileName: string;
  mimeType?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  className?: string;
  iconOnly?: boolean;
};

function triggerDownload(content: string, fileName: string, mimeType: string) {
  const fileBlob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(fileBlob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = "none";

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function DownloadContentButton({
  content,
  fileName,
  mimeType = "text/plain;charset=utf-8",
  label = "Download",
  variant = "outline",
  size = "sm",
  className,
  iconOnly = false,
}: DownloadContentButtonProps) {
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    triggerDownload(content, fileName, mimeType);
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? "icon-xs" : size}
      className={className}
      onClick={onClick}
      aria-label={iconOnly ? `${label} ${fileName}` : undefined}
      title={`${label} ${fileName}`}
    >
      <Download aria-hidden="true" />
      {iconOnly ? null : label}
    </Button>
  );
}
