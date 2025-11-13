import { Type, FileText, Layout, EyeOff, PointerOff, PencilRuler, Image, Link as LinkIcon, ArrowUpDown, CheckSquare } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId } from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export function CardEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const updateCustomId = (newCustomId: string) => {
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
            updateElement(elementId, { customId: newCustomId });
        }
    };

    return (
        <div className="component-props">
            {/* Basic */}
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="card_1"
            />

            {/* Content - Headings */}
            <fieldset className="properties-group">
                <legend>Content</legend>

                <PropertyInput
                    label="Heading"
                    value={String(currentProps.heading || '')}
                    onChange={(value) => updateProp('heading', value)}
                    icon={Type}
                    placeholder="Main heading"
                />

                <PropertyInput
                    label="Subheading"
                    value={String(currentProps.subheading || '')}
                    onChange={(value) => updateProp('subheading', value)}
                    icon={FileText}
                    placeholder="Subheading text"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.TITLE}
                    value={String(currentProps.title || '')}
                    onChange={(value) => updateProp('title', value)}
                    icon={Type}
                    placeholder="Card title"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={FileText}
                    placeholder="Description text"
                    multiline
                />

                <PropertyInput
                    label="Footer"
                    value={String(currentProps.footer || '')}
                    onChange={(value) => updateProp('footer', value)}
                    icon={FileText}
                    placeholder="Footer text"
                />
            </fieldset>

            {/* Design - Variant & Size */}
            <fieldset className="properties-group">
                <legend>Design</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.VARIANT}
                    value={String(currentProps.variant || 'default')}
                    onChange={(value) => updateProp('variant', value)}
                    options={[
                        { value: 'default', label: 'Default' },
                        { value: 'primary', label: 'Primary' },
                        { value: 'secondary', label: 'Secondary' },
                        { value: 'surface', label: 'Surface' },
                        { value: 'elevated', label: 'Elevated' },
                        { value: 'outlined', label: 'Outlined' },
                        { value: 'gallery', label: 'Gallery' },
                        { value: 'quiet', label: 'Quiet' }
                    ]}
                    icon={Layout}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.SIZE}
                    value={String(currentProps.size || 'md')}
                    onChange={(value) => updateProp('size', value)}
                    options={[
                        { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
                        { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
                        { value: 'lg', label: PROPERTY_LABELS.SIZE_LG }
                    ]}
                    icon={PencilRuler}
                />

                <PropertySelect
                    label="Orientation"
                    value={String(currentProps.orientation || 'vertical')}
                    onChange={(value) => updateProp('orientation', value)}
                    options={[
                        { value: 'vertical', label: 'Vertical' },
                        { value: 'horizontal', label: 'Horizontal' }
                    ]}
                    icon={ArrowUpDown}
                />
            </fieldset>

            {/* Asset & Preview */}
            <fieldset className="properties-group">
                <legend>Asset & Media</legend>

                <PropertySelect
                    label="Asset Type"
                    value={String(currentProps.asset || '')}
                    onChange={(value) => updateProp('asset', value || undefined)}
                    options={[
                        { value: '', label: 'None' },
                        { value: 'file', label: 'File' },
                        { value: 'folder', label: 'Folder' },
                        { value: 'image', label: 'Image' },
                        { value: 'video', label: 'Video' },
                        { value: 'audio', label: 'Audio' }
                    ]}
                    icon={Image}
                />

                {currentProps.asset && (
                    <PropertyInput
                        label="Asset Source URL"
                        value={String(currentProps.assetSrc || '')}
                        onChange={(value) => updateProp('assetSrc', value)}
                        icon={Image}
                        placeholder="https://example.com/image.jpg"
                    />
                )}

                {currentProps.variant === 'gallery' && (
                    <PropertyInput
                        label="Preview Image URL"
                        value={String(currentProps.preview || '')}
                        onChange={(value) => updateProp('preview', value)}
                        icon={Image}
                        placeholder="https://example.com/preview.jpg"
                    />
                )}
            </fieldset>

            {/* Interactions */}
            <fieldset className="properties-group">
                <legend>Interactions</legend>

                <PropertyInput
                    label="Link (href)"
                    value={String(currentProps.href || '')}
                    onChange={(value) => updateProp('href', value)}
                    icon={LinkIcon}
                    placeholder="https://example.com"
                />

                {currentProps.href && (
                    <PropertySelect
                        label="Link Target"
                        value={String(currentProps.target || '_self')}
                        onChange={(value) => updateProp('target', value)}
                        options={[
                            { value: '_self', label: 'Same Tab' },
                            { value: '_blank', label: 'New Tab' }
                        ]}
                        icon={LinkIcon}
                    />
                )}

                <PropertySwitch
                    label="Selectable"
                    isSelected={Boolean(currentProps.isSelectable)}
                    onChange={(checked) => updateProp('isSelectable', checked)}
                    icon={CheckSquare}
                />

                {currentProps.isSelectable && (
                    <PropertySwitch
                        label="Selected"
                        isSelected={Boolean(currentProps.isSelected)}
                        onChange={(checked) => updateProp('isSelected', checked)}
                        icon={CheckSquare}
                    />
                )}
            </fieldset>

            {/* States */}
            <fieldset className="properties-group">
                <legend>States</legend>

                <PropertySwitch
                    label={PROPERTY_LABELS.IS_QUIET}
                    isSelected={Boolean(currentProps.isQuiet)}
                    onChange={(checked) => updateProp('isQuiet', checked)}
                    icon={EyeOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />
            </fieldset>

            {/* Accessibility */}
            <fieldset className="properties-group">
                <legend>Accessibility</legend>

                <PropertyInput
                    label="ARIA Label"
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value)}
                    placeholder="Describe the card"
                />

                <PropertyInput
                    label="ARIA Described By"
                    value={String(currentProps['aria-describedby'] || '')}
                    onChange={(value) => updateProp('aria-describedby', value)}
                    placeholder="description-id"
                />
            </fieldset>
        </div>
    );
}
