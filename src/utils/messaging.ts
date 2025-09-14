// 통합 메시징 유틸리티
export class MessageService {
    private static iframe: HTMLIFrameElement | null = null;

    static getIframe(): HTMLIFrameElement | null {
        if (!this.iframe) {
            this.iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
        }
        return this.iframe;
    }

    static sendToIframe(type: string, payload: any) {
        const iframe = this.getIframe();
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type, payload }, window.location.origin);
        }
    }

    static sendToWindow(type: string, payload: any) {
        window.postMessage({ type, payload }, window.location.origin);
    }

    static clearOverlay() {
        this.sendToWindow("CLEAR_OVERLAY", {});
    }
}
