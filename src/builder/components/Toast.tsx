/**
 * Toast Component
 *
 * 알림 메시지 표시 컴포넌트
 */

import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Button } from "react-aria-components";
import { iconProps, iconEditProps } from "../../utils/ui/uiConstants";
import type { ToastType } from "../hooks/useToast";
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
}

export function Toast({ id, type, message, onDismiss }: ToastProps) {
  const Icon = ICONS[type];

  return (
    <div className="toast" data-type={type} role="alert" aria-live="polite">
      <Icon size={iconProps.size} className="toast-icon" aria-hidden="true" />
      <span className="toast-message">{message}</span>
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
