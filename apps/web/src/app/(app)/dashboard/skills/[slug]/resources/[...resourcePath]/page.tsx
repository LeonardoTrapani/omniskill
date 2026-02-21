import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import ResourceDetail from "./resource-detail";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string; resourcePath: string[] }>;
}) {
  const { slug, resourcePath } = await params;

  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect(
      `/login?next=${encodeURIComponent(`/dashboard/skills/${slug}/resources/${resourcePath.join("/")}`)}`,
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

  return <ResourceDetail slug={slug} resourcePath={decodedResourcePath} />;
}
