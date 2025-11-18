/**
 * TypeScript definitions for Electron IPC API
 * 
 * NOTE: 현재 프로젝트는 Electron을 사용하지 않습니다.
 * 향후 Electron 지원이 필요한 경우 이 파일을 활성화하세요.
 */

// Electron 관련 타입 정의는 현재 사용하지 않으므로 주석 처리
// 필요시 아래 주석을 해제하여 사용할 수 있습니다.

/*
declare global {
  interface Window {
    electron?: {
      app: {
        getUserDataPath(): Promise<string>;
        getVersion(): Promise<string>;
      };
      platform: string;
      isElectron: true;
    };

    process?: {
      versions?: {
        electron?: string;
        node?: string;
        chrome?: string;
      };
    };
  }
}
*/

export {};
