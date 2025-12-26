import {
  TextField,
  Input,
  Label,
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  TextArea,
} from "react-aria-components";
import { useState } from "react";
import type { APICallConfig } from "../types/eventTypes";

export interface APICallActionEditorProps {
  config: APICallConfig;
  onChange: (config: APICallConfig) => void;
}

export function APICallActionEditor({
  config,
  onChange,
}: APICallActionEditorProps) {
  const [headersJson, setHeadersJson] = useState(() =>
    JSON.stringify(config.headers || {}, null, 2)
  );
  const [bodyJson, setBodyJson] = useState(() =>
    JSON.stringify(config.body || {}, null, 2)
  );

  const updateEndpoint = (endpoint: string) => {
    onChange({ ...config, endpoint });
  };

  const updateMethod = (method: string) => {
    onChange({ ...config, method: method as APICallConfig["method"] });
  };

  const updateHeaders = (value: string) => {
    setHeadersJson(value);
    try {
      const parsed = JSON.parse(value);
      onChange({ ...config, headers: parsed });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // Ignore invalid JSON
    }
  };

  const updateBody = (value: string) => {
    setBodyJson(value);
    try {
      const parsed = JSON.parse(value);
      onChange({ ...config, body: parsed });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // Ignore invalid JSON
    }
  };

  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

  return (
    <div className="apicall-action-editor">
      <TextField className="field">
        <Label className="field-label">Endpoint</Label>
        <Input
          className="field-input"
          value={config.endpoint}
          onChange={(e) => updateEndpoint(e.target.value)}
          placeholder="/api/users"
        />
      </TextField>

      <div className="field">
        <Label className="field-label">Method</Label>
        <Select
          selectedKey={config.method}
          onSelectionChange={(key) => updateMethod(key as string)}
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {methods.map((method) => (
                <ListBoxItem key={method} id={method} textValue={method}>
                  {method}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      <TextField className="field">
        <Label className="field-label">Headers (JSON)</Label>
        <TextArea
          className="field-textarea"
          value={headersJson}
          onChange={(e) => updateHeaders(e.target.value)}
          rows={3}
        />
      </TextField>

      <TextField className="field">
        <Label className="field-label">Body (JSON)</Label>
        <TextArea
          className="field-textarea"
          value={bodyJson}
          onChange={(e) => updateBody(e.target.value)}
          rows={4}
        />
      </TextField>
    </div>
  );
}
