/*import { useParams } from "@remix-run/react";
import Builder from "../builder/index";

export default function BuilderdRoute() {
    const { projectId } = useParams();
    return <Builder projectId={projectId} />;
}*/


// app/routes/builder.$projectId.tsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import Preview from "../builder/preview";

import type { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async ({ params }) => {
  return json({ projectId: params.projectId });
};

export default function PreviewRoute() {
  const { projectId } = useLoaderData<typeof loader>();
  return <Preview projectId={projectId} />;
}