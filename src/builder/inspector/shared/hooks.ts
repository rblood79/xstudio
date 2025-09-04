/* Shared hooks for inspector components */
import { useStore } from '../../stores/elements';
import { supabase } from '../../../env/supabase.client';

// Common hook for updating element properties
export function useElementUpdate() {
    const { selectedElementId, updateElementProps } = useStore();

    const updateElement = async (updatedProps: Record<string, unknown>) => {
        if (!selectedElementId) return;

        // Update store
        updateElementProps(
            selectedElementId, 
            updatedProps as Record<string, string | number | boolean | undefined>
        );

        // Update database
        try {
            await supabase
                .from('elements')
                .update({ props: updatedProps })
                .eq('id', selectedElementId);
        } catch (err) {
            console.error('Update error:', err);
        }
    };

    return { updateElement, elementId: selectedElementId };
}

// Hook for selected element properties
export function useSelectedElement() {
    const { selectedElementId, selectedElementProps } = useStore();
    
    return {
        elementId: selectedElementId,
        elementProps: selectedElementProps,
        isSelected: !!selectedElementId
    };
}