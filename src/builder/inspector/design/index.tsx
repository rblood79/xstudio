import { useSelectedElement } from '../shared/hooks';
import './index.css';

function Design() {
    const { isSelected } = useSelectedElement();

    // 선택된 요소가 없을 때의 처리
    if (!isSelected) {
        return (
            <div className='design-container'>
                <div className="empty-state">
                    <h4>요소를 선택해주세요</h4>
                    <p>디자인을 편집하려면 먼저 요소를 선택하세요.</p>
                </div>
            </div>
        );
    }

    return (
        <div className='design-container'>
            <div className="empty-state">
                <h4>디자인 패널</h4>
                <p>디자인 패널이 리팩토링 중입니다.</p>
            </div>
        </div>
    );
}

export default Design;