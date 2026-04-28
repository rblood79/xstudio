import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import { AlertTriangle } from "lucide-react";
import {
  resolveEditingSemanticsImpactConfirmation,
  subscribeEditingSemanticsImpactConfirmation,
  type EditingSemanticsImpactConfirmationRequest,
} from "../../utils/editingSemanticsImpactConfirmation";
import "./EditingSemanticsImpactDialog.css";

export function EditingSemanticsImpactDialogHost() {
  const [request, setRequest] =
    useState<EditingSemanticsImpactConfirmationRequest | null>(null);

  useEffect(() => {
    return subscribeEditingSemanticsImpactConfirmation(setRequest);
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && request) {
      resolveEditingSemanticsImpactConfirmation(false);
    }
  };

  const handleCancel = () => {
    resolveEditingSemanticsImpactConfirmation(false);
  };

  const handleContinue = () => {
    resolveEditingSemanticsImpactConfirmation(true);
  };

  const instanceLabel =
    request?.instanceCount === 1
      ? "1 instance"
      : `${request?.instanceCount ?? 0} instances`;
  const previewInstanceIds = request?.impactedInstanceIds.slice(0, 5) ?? [];
  const hiddenInstanceCount = Math.max(
    0,
    (request?.instanceCount ?? 0) - previewInstanceIds.length,
  );

  return (
    <ModalOverlay
      className="editing-impact-overlay"
      isDismissable
      isOpen={Boolean(request)}
      onOpenChange={handleOpenChange}
    >
      <Modal className="editing-impact-modal">
        <Dialog aria-label="Component impact preview">
          <div className="editing-impact-header">
            <AlertTriangle aria-hidden="true" size={18} />
            <Heading className="editing-impact-title" slot="title">
              Component impact
            </Heading>
          </div>
          <div className="editing-impact-body">
            <p>
              Editing {request?.originLabel ?? "this component"} will affect{" "}
              <strong>{instanceLabel}</strong>.
            </p>
            <p className="editing-impact-meta">
              Counted in {request?.countDurationMs.toFixed(1) ?? "0.0"}ms.
            </p>
            {previewInstanceIds.length > 0 && (
              <div
                aria-label="Affected instances"
                className="editing-impact-list"
              >
                {previewInstanceIds.map((instanceId) => (
                  <span className="editing-impact-list-item" key={instanceId}>
                    {instanceId}
                  </span>
                ))}
                {hiddenInstanceCount > 0 && (
                  <span className="editing-impact-list-more">
                    +{hiddenInstanceCount} more
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="editing-impact-actions">
            <Button
              className="editing-impact-button editing-impact-button--secondary"
              onPress={handleCancel}
            >
              Cancel
            </Button>
            <Button
              autoFocus
              className="editing-impact-button editing-impact-button--primary"
              onPress={handleContinue}
            >
              Continue
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
