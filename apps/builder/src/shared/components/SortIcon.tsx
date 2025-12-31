import { ArrowUp, ArrowDown } from 'lucide-react';

export function SortIcon({ direction }: { direction: 'ascending' | 'descending' }) {
    if (direction === 'ascending') {
        return <ArrowUp />;
    } else if (direction === 'descending') {
        return <ArrowDown />;
    }
    return null;
}
