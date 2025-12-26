/**
 * Toast Component
 *
 * 알림 메시지 표시 컴포넌트
 * - Action 버튼 지원 (Undo 등)
 */

import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Button } from "react-aria-components";
import { iconProps, iconEditProps } from "../../utils/ui/uiConstants";
import type { ToastType } from "../hooks/useToast";
import type { ToastAction } from "../stores/toast";
import "./styles/Toast.css";

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
} as const;

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onDismiss: (id: string) => void;
  /** Optional action button (e.g., Undo) */
  action?: ToastAction;
}

export function Toast({ id, type, message, onDismiss, action }: ToastProps) {
  const Icon = ICONS[type];

  const handleAction = () => {
    action?.onClick();
    onDismiss(id); // 액션 실행 후 자동 닫기
  };

  return (
    <div className="toast" data-type={type} role="alert" aria-live="polite">
      <Icon size={iconProps.size} className="toast-icon" aria-hidden="true" />
      <span className="toast-message">{message}</span>
      {action && (
        <Button
          className="toast-action"
          onPress={handleAction}
        >
          {action.label}
        </Button>
      )}
      <Button
        className="toast-dismiss"
        onPress={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        <X size={iconEditProps.size} aria-hidden="true" />
      </Button>
    </div>
  );
}
