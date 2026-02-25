import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import ResourceDetail from "./resource-detail";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string; resourcePath: string[] }>;
}) {
  const { id, resourcePath } = await params;

  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect(
      `/login?next=${encodeURIComponent(`/dashboard/skills/${id}/resources/${resourcePath.join("/")}`)}`,
    );
  }

  const decodedResourcePath = resourcePath
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join("/");

  return <ResourceDetail skillId={id} resourcePath={decodedResourcePath} />;
}
