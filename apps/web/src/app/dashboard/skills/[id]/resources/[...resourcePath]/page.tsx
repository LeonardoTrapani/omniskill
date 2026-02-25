import { buildResourceHref } from "@/features/skills/lib/routes";
import { requireSession } from "@/shared/auth/require-session";

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

  return <ResourceDetail skillId={id} resourcePath={decodedResourcePath} />;
}
