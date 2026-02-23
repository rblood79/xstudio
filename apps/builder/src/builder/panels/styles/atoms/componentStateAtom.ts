/**
 * Component State Preview Atom
 *
 * 캔버스에서 컴포넌트 상태(hover, pressed, disabled 등)를 미리보기하기 위한 Jotai atom.
 * StylesPanel의 ComponentStateSection에서 설정하고, ElementSprite에서 구독한다.
 */

import { atom } from 'jotai';
import type { ComponentState } from '@xstudio/specs';

/**
 * 미리보기할 컴포넌트 상태.
 * null이면 기본 로직(default)을 따른다.
 */
export const previewComponentStateAtom = atom<ComponentState | null>(null);
