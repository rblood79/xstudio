import { useEffect } from 'react';
import { useStore } from './stores';
import { useParams } from 'react-router';

function Builder() {
    const { setCurrentPageId } = useStore();
    const { pageId } = useParams<{ pageId: string }>();

    useEffect(() => {
        if (pageId) {
            setCurrentPageId(pageId);
        }
    }, [pageId, setCurrentPageId]);

    // ... 나머지 코드
}

export default Builder; 