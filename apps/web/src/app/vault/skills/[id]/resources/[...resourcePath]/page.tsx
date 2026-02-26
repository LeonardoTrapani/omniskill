import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { buildResourceHref, buildResourceTabHref } from "@/lib/skills/routes";
import { requireSession } from "@/lib/auth/require-session";

import ResourceDetail from "./resource-detail";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string; resourcePath: string[] }>;
}) {
  const { id, resourcePath } = await params;

  const decodedResourcePath = resourcePath
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join("/");

  await requireSession(buildResourceHref(id, decodedResourcePath));

  const userAgent = (await headers()).get("user-agent") ?? "";
  if (!isMobileUserAgent(userAgent)) {
    redirect(buildResourceTabHref(id, decodedResourcePath));
  }

  return <ResourceDetail skillId={id} resourcePath={decodedResourcePath} />;
}

function isMobileUserAgent(userAgent: string) {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
}
