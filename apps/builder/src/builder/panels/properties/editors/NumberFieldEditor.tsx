import { memo } from "react";
import { NumberFieldSpec } from "@xstudio/specs";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";

export const NumberFieldEditor = memo(function NumberFieldEditor(
  props: PropertyEditorProps,
) {
  return <GenericPropertyEditor {...props} spec={NumberFieldSpec} />;
});
