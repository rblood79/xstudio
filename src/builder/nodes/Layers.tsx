import React from 'react';
import { CopyMinus } from 'lucide-react'; // CopyMinus 추가
import { ElementProps } from '../../types/supabase';
import { Element } from '../../types/store'; // 통합된 타입 사용
import { useStore } from '../stores'; // useStore import 추가
import { MessageService } from '../../utils/messaging'; // 메시징 서비스 추가
import './index.css';

interface LayersProps {
    elements: Element[];
    setElements: React.Dispatch<React.SetStateAction<Element[]>>;
    selectedElementId: string | null;
    setSelectedElement: (id: string | null, props?: ElementProps) => void;
    renderTree: (
        items: Element[],
        getLabel: (item: Element) => string,
        onSelect: (item: Element) => void,
        onDelete: (item: Element) => Promise<void>
    ) => React.ReactNode;
    sendElementSelectedMessage: (id: string, props: ElementProps) => void;
    collapseAllTreeItems?: () => void; // 새로운 props 추가
}

export function Layers({
    elements,
    selectedElementId,
    setSelectedElement,
    renderTree,
    sendElementSelectedMessage,
    collapseAllTreeItems
}: LayersProps) {
    const { removeElement } = useStore(); // removeElement 함수 가져오기

    return (
        <div className="sidebar_elements">
            <div className="panel-header">
                <h3 className='panel-title'>Layer</h3>
                <div className="header-actions">
                    <button
                        className='iconButton'
                        aria-label="collapseAll"
                        onClick={() => {
                            // collapseAllTreeItems 함수가 있으면 호출
                            if (collapseAllTreeItems) {
                                collapseAllTreeItems();
                            }
                        }}
                    >
                        <CopyMinus color="#666" strokeWidth={1.5} size={16} />
                    </button>
                </div>
            </div>
            <div className="elements">
                {elements.length === 0 ? (
                    <p className="no_element">No element available</p>
                ) : (
                    renderTree(
                        elements,
                        (el) => el.tag,
                        (el) => {
                            setSelectedElement(el.id, el.props as any);
                            requestAnimationFrame(() => sendElementSelectedMessage(el.id, el.props as any));
                        },
                        async (el) => {
                            // removeElement 함수 사용 (Tab/Panel 쌍 삭제 로직 포함)
                            await removeElement(el.id);

                            // 선택된 요소가 삭제된 경우 선택 해제
                            if (el.id === selectedElementId) {
                                setSelectedElement(null);
                                MessageService.clearOverlay();
                            }
                        }
                    )
                )}
            </div>
        </div>
    );
}