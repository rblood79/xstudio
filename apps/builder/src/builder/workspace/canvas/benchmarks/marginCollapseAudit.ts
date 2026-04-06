import { createClient } from "@supabase/supabase-js";

interface AuditResult {
  totalElements: number;
  blockWithAdjacentMargins: number;
  ratio: string;
  conclusion: "SAFE_TO_SKIP" | "NEEDS_IMPLEMENTATION";
}

export async function auditMarginCollapse(): Promise<AuditResult> {
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  let totalElements = 0;
  let blockWithAdjacentMargins = 0;

  const { data: projects } = await supabase.from("projects").select("id");
  if (!projects)
    return {
      totalElements: 0,
      blockWithAdjacentMargins: 0,
      ratio: "0%",
      conclusion: "SAFE_TO_SKIP",
    };

  for (const project of projects) {
    const { data: elements } = await supabase
      .from("elements")
      .select("tag, properties")
      .eq("project_id", project.id);

    if (!elements) continue;

    for (const el of elements) {
      totalElements++;
      const style = (el.properties as Record<string, unknown>)?.style as
        | Record<string, unknown>
        | undefined;
      if (
        style?.display === "block" &&
        (style?.marginTop || style?.marginBottom)
      ) {
        blockWithAdjacentMargins++;
      }
    }
  }

  const ratio =
    totalElements > 0
      ? ((blockWithAdjacentMargins / totalElements) * 100).toFixed(3)
      : "0";

  return {
    totalElements,
    blockWithAdjacentMargins,
    ratio: `${ratio}%`,
    conclusion:
      parseFloat(ratio) < 0.1 ? "SAFE_TO_SKIP" : "NEEDS_IMPLEMENTATION",
  };
}
