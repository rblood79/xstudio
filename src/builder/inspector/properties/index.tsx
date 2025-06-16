import { useStore } from '../../stores/elements';
import { Button, Select, SelectItem } from '../../components/list';
import { supabase } from '../../../env/supabase.client';
import { EllipsisVertical } from 'lucide-react';
import { iconProps } from '../../constants';

function Properties() {
    const { selectedElementId, selectedElementProps, updateElementProps } = useStore();

    if (!selectedElementId) {
        return <div>요소를 선택해주세요</div>;
    }

    return (
        <div className="panel-content">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>ARIA Properties</legend>
                <div className='aria-controls'>
                    <div className='aria-control aria-Group'>
                        <label className='control-label'>Role</label>
                        <Select
                            items={[
                                { id: 'button', name: 'button' },
                                { id: 'checkbox', name: 'checkbox' },
                                { id: 'dialog', name: 'dialog' },
                                { id: 'grid', name: 'grid' },
                                { id: 'link', name: 'link' },
                                { id: 'menuitem', name: 'menuitem' },
                                { id: 'option', name: 'option' },
                                { id: 'radio', name: 'radio' },
                                { id: 'slider', name: 'slider' },
                                { id: 'spinbutton', name: 'spinbutton' },
                                { id: 'switch', name: 'switch' },
                                { id: 'tab', name: 'tab' },
                                { id: 'textbox', name: 'textbox' }
                            ]}
                            selectedKey={selectedElementProps.role || 'button'}
                            aria-label="Role selector"
                            onSelectionChange={async (selected) => {
                                if (!selectedElementId) return;
                                const updatedProps = {
                                    ...selectedElementProps,
                                    role: selected
                                };
                                updateElementProps(selectedElementId, updatedProps);
                                try {
                                    const { error } = await supabase
                                        .from('elements')
                                        .update({ props: updatedProps })
                                        .eq('id', selectedElementId);
                                    if (error) console.error('Supabase update error:', error);
                                } catch (err) {
                                    console.error('Unexpected error during Supabase update:', err);
                                }
                            }}
                        >
                            {(item) => <SelectItem>{item.name}</SelectItem>}
                        </Select>
                    </div>

                    <div className='aria-control aria-Group'>
                        <label className='control-label'>Label</label>
                        <input
                            className='control-input'
                            value={selectedElementProps['aria-label'] || ''}
                            onChange={async (e) => {
                                if (!selectedElementId) return;
                                const updatedProps = {
                                    ...selectedElementProps,
                                    'aria-label': e.target.value
                                };
                                updateElementProps(selectedElementId, updatedProps);
                                try {
                                    const { error } = await supabase
                                        .from('elements')
                                        .update({ props: updatedProps })
                                        .eq('id', selectedElementId);
                                    if (error) console.error('Supabase update error:', error);
                                } catch (err) {
                                    console.error('Unexpected error during Supabase update:', err);
                                }
                            }}
                        />
                    </div>

                    <div className='aria-control aria-Group'>
                        <label className='control-label'>Description</label>
                        <input
                            className='control-input'
                            value={selectedElementProps['aria-description'] || ''}
                            onChange={async (e) => {
                                if (!selectedElementId) return;
                                const updatedProps = {
                                    ...selectedElementProps,
                                    'aria-description': e.target.value
                                };
                                updateElementProps(selectedElementId, updatedProps);
                                try {
                                    const { error } = await supabase
                                        .from('elements')
                                        .update({ props: updatedProps })
                                        .eq('id', selectedElementId);
                                    if (error) console.error('Supabase update error:', error);
                                } catch (err) {
                                    console.error('Unexpected error during Supabase update:', err);
                                }
                            }}
                        />
                    </div>
                </div>
                <div className='fieldset-actions'>
                    <Button><EllipsisVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
                </div>
            </fieldset>
        </div>
    );
}

export default Properties;