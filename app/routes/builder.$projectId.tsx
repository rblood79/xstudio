import { useParams } from "@remix-run/react";
import Builder from "../builder/index";

export default function BuilderdRoute() {
    const { projectId } = useParams();
    return <Builder projectId={projectId} />;
}