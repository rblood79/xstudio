import { useParams } from "@remix-run/react";
import Preview from "../builder/preview";

export default function PreviewRoute() {
    const { projectId } = useParams();
    return <Preview projectId={projectId} />;
}