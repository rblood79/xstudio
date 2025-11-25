/**
 * ExistingSlotDialog - 기존 Slot 처리 확인 다이얼로그
 *
 * Phase 6: 프리셋 적용 시 기존 Slot 처리 선택
 *
 * 프리셋 적용 시 기존 Slot이 있으면:
 * - 덮어쓰기: 기존 Slot 삭제 후 새로 생성
 * - 병합: 기존 Slot 유지, 없는 Slot만 추가
 * - 취소: 프리셋 적용 취소
 */

import { memo, useCallback } from "react";
import { AlertTriangle, Trash2, Merge, X } from "lucide-react";
import { Button } from "../../../../components";
import {
  Dialog,
  DialogTrigger,
  Modal,
  Heading,
} from "react-aria-components";
import type { ExistingSlotInfo, PresetApplyMode } from "./types";

interface ExistingSlotDialogProps {
  /** 다이얼로그 열림 상태 */
  isOpen: boolean;
  /** 기존 Slot 목록 */
  existingSlots: ExistingSlotInfo[];
  /** 적용할 프리셋 이름 */
  presetName: string;
  /** 모드 선택 콜백 */
  onConfirm: (mode: PresetApplyMode) => void;
  /** 닫기 콜백 */
  onClose: () => void;
}

export const ExistingSlotDialog = memo(function ExistingSlotDialog({
  isOpen,
  existingSlots,
  presetName,
  onConfirm,
  onClose,
}: ExistingSlotDialogProps) {
  const hasChildrenSlots = existingSlots.some((slot) => slot.hasChildren);

  const handleReplace = useCallback(() => {
    onConfirm("replace");
  }, [onConfirm]);

  const handleMerge = useCallback(() => {
    onConfirm("merge");
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    onConfirm("cancel");
    onClose();
  }, [onConfirm, onClose]);

  if (!isOpen) return null;

  return (
    <DialogTrigger isOpen={isOpen}>
      <Modal
        isDismissable
        onOpenChange={(open) => !open && onClose()}
        className="react-aria-Modal"
      >
        <Dialog className="react-aria-Dialog existing-slot-dialog">
          <Heading slot="title" className="dialog-title">
            <AlertTriangle className="icon-warning" size={20} />
            기존 Slot이 있습니다
          </Heading>

          <div className="dialog-content">
            <p className="dialog-description">
              &ldquo;{presetName}&rdquo; 프리셋을 적용하려면 기존 Slot을
              어떻게 처리할지 선택하세요.
            </p>

            <div className="existing-slots-list">
              <p className="list-title">
                현재 Slot ({existingSlots.length}개):
              </p>
              <ul>
                {existingSlots.map((slot) => (
                  <li key={slot.elementId}>
                    <span className="slot-name">{slot.slotName}</span>
                    {slot.hasChildren && (
                      <span className="slot-warning">(콘텐츠 있음)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {hasChildrenSlots && (
              <div className="warning-box">
                <AlertTriangle size={16} />
                <span>
                  일부 Slot에 콘텐츠가 있습니다. 덮어쓰기 시 삭제됩니다.
                </span>
              </div>
            )}
          </div>

          <div className="dialog-actions">
            <Button variant="default" onPress={handleCancel}>
              <X size={16} />
              취소
            </Button>
            <Button variant="secondary" onPress={handleMerge}>
              <Merge size={16} />
              병합 (새 Slot만 추가)
            </Button>
            <Button variant="primary" onPress={handleReplace}>
              <Trash2 size={16} />
              덮어쓰기
            </Button>
          </div>
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
});

export default ExistingSlotDialog;
