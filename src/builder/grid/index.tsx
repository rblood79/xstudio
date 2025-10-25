import { useStore } from '../stores';
import './index.css';

export default function Grid() {
    const showGrid = useStore((state) => state.showGrid);
    const gridSize = useStore((state) => state.gridSize);

    if (!showGrid) {
        return null;
    }

    return (
        <div
            className="grid-overlay"
            style={{
                backgroundSize: `${gridSize}px ${gridSize}px`,
            }}
        />
    );
}
