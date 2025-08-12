import { Input, Tabs, TabList, Tab, TabPanel, Button, TextField, Select, SelectItem, Slider, Checkbox, RadioGroup, Radio } from '../../components/list';

interface Option {
    id: string;
    name: string;
}

const selectOptions: Option[] = [
    { id: '1', name: 'Option 1' },
    { id: '2', name: 'Option 2' },
    { id: '3', name: 'Option 3' },
];

export function ThemePreview() {
    return (
        <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Buttons */}
            <div className="flex flex-col gap-2">
                <h5 className="text-xs font-medium text-gray-600">Buttons</h5>
                <div className="flex gap-2 flex-wrap">
                    <Button>Primary Button</Button>
                    <Button>
                        <span style={{ color: 'var(--color-primary, #3B82F6)' }}>
                            Styled Button
                        </span>
                    </Button>
                    <Button isDisabled>Disabled Button</Button>
                </div>
            </div>

            {/* Form Elements */}
            <div className="flex flex-col gap-2">
                <h5 className="text-xs font-medium text-gray-600">Form Elements</h5>
                <div className="flex flex-col gap-3">
                    <TextField
                        label="Text Input"
                        description="Helper text for input field"
                    >
                        <Input placeholder="Enter text..." />
                    </TextField>

                    <Select
                        label="Select Dropdown"
                        placeholder="Choose option..."
                        items={selectOptions}
                    >
                        {(item) => <SelectItem id={item.id}>{item.name}</SelectItem>}
                    </Select>

                    <Slider
                        label="Slider Control"
                        defaultValue={50}
                        minValue={0}
                        maxValue={100}
                    />
                </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-2">
                <h5 className="text-xs font-medium text-gray-600">Checkboxes</h5>
                <div className="flex flex-col gap-2">
                    <Checkbox defaultSelected>Checked Option</Checkbox>
                    <Checkbox>Unchecked Option</Checkbox>
                    <Checkbox isIndeterminate>Indeterminate Option</Checkbox>
                    <Checkbox isDisabled>Disabled Option</Checkbox>
                </div>
            </div>

            {/* Radio Groups */}
            <div className="flex flex-col gap-2">
                <h5 className="text-xs font-medium text-gray-600">Radio Groups</h5>
                <RadioGroup
                    label="Choose Option"
                    defaultValue="option1"
                    description="Select one option from the list"
                >
                    <Radio value="option1">Option 1</Radio>
                    <Radio value="option2">Option 2</Radio>
                    <Radio value="option3">Option 3</Radio>
                </RadioGroup>
            </div>

            {/* Tabs */}
            <div className="flex flex-col gap-2">
                <h5 className="text-xs font-medium text-gray-600">Tabs</h5>
                <Tabs defaultSelectedKey="tab1">
                    <TabList>
                        <Tab id="tab1">First Tab</Tab>
                        <Tab id="tab2">Second Tab</Tab>
                        <Tab id="tab3">Third Tab</Tab>
                    </TabList>
                    <TabPanel id="tab1">
                        <div className="p-3 text-sm">
                            Content for the first tab goes here.
                        </div>
                    </TabPanel>
                    <TabPanel id="tab2">
                        <div className="p-3 text-sm">
                            Content for the second tab goes here.
                        </div>
                    </TabPanel>
                    <TabPanel id="tab3">
                        <div className="p-3 text-sm">
                            Content for the third tab goes here.
                        </div>
                    </TabPanel>
                </Tabs>
            </div>

            {/* Typography Examples */}
            <div className="flex flex-col gap-2">
                <h5 className="text-xs font-medium text-gray-600">Typography</h5>
                <div className="flex flex-col gap-1">
                    <h1
                        className="text-2xl font-bold"
                        style={{
                            color: 'var(--color-text-heading, #111827)',
                            fontFamily: 'var(--font-heading, inherit)'
                        }}
                    >
                        Heading 1
                    </h1>
                    <h2
                        className="text-xl font-semibold"
                        style={{
                            color: 'var(--color-text-heading, #111827)',
                            fontFamily: 'var(--font-heading, inherit)'
                        }}
                    >
                        Heading 2
                    </h2>
                    <p
                        className="text-sm"
                        style={{
                            color: 'var(--color-text-body, #374151)',
                            fontFamily: 'var(--font-body, inherit)'
                        }}
                    >
                        Body text example with normal font weight and readable color.
                    </p>
                    <a
                        href="#"
                        className="text-sm underline"
                        style={{
                            color: 'var(--color-link, #3B82F6)',
                            fontFamily: 'var(--font-body, inherit)'
                        }}
                        onClick={(e) => e.preventDefault()}
                    >
                        Link example
                    </a>
                </div>
            </div>

            {/* Status Indicators */}
            <div className="flex flex-col gap-2">
                <h5 className="text-xs font-medium text-gray-600">Status & Badges</h5>
                <div className="flex gap-1 flex-wrap">
                    <span
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{
                            backgroundColor: 'var(--color-primary, #3B82F6)',
                            color: 'white'
                        }}
                    >
                        Primary
                    </span>
                    <span
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{
                            backgroundColor: 'var(--color-success, #10B981)',
                            color: 'white'
                        }}
                    >
                        Success
                    </span>
                    <span
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{
                            backgroundColor: 'var(--color-warning, #F59E0B)',
                            color: 'white'
                        }}
                    >
                        Warning
                    </span>
                    <span
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{
                            backgroundColor: 'var(--color-danger, #EF4444)',
                            color: 'white'
                        }}
                    >
                        Danger
                    </span>
                </div>
            </div>

            {/* Cards & Surfaces */}
            <div className="flex flex-col gap-2">
                <h5 className="text-xs font-medium text-gray-600">Cards & Surfaces</h5>
                <div className="grid grid-cols-2 gap-2">
                    <div
                        className="p-3 rounded-lg border"
                        style={{
                            backgroundColor: 'var(--color-surface, white)',
                            borderColor: 'var(--color-border, #E5E7EB)',
                            borderRadius: 'var(--radius-card, 0.5rem)'
                        }}
                    >
                        <h6
                            className="font-medium text-sm mb-1"
                            style={{ color: 'var(--color-text-heading, #111827)' }}
                        >
                            Card Title
                        </h6>
                        <p
                            className="text-xs"
                            style={{ color: 'var(--color-text-body, #374151)' }}
                        >
                            Card content here.
                        </p>
                    </div>
                    <div
                        className="p-3 rounded-lg"
                        style={{
                            backgroundColor: 'var(--color-primary, #3B82F6)',
                            borderRadius: 'var(--radius-card, 0.5rem)'
                        }}
                    >
                        <h6 className="font-medium text-sm mb-1 text-white">
                            Featured Card
                        </h6>
                        <p className="text-xs text-white/80">
                            Primary colored card.
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress & Loading */}
            <div className="flex flex-col gap-2">
                <h5 className="text-xs font-medium text-gray-600">Progress</h5>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs" style={{ color: 'var(--color-text-muted, #6B7280)' }}>
                            Progress: 65%
                        </span>
                        <div
                            className="w-full rounded-full h-2"
                            style={{ backgroundColor: 'var(--color-neutral-200, #E5E7EB)' }}
                        >
                            <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                    backgroundColor: 'var(--color-primary, #3B82F6)',
                                    width: '65%'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacing Visualization */}
            <div className="flex flex-col gap-2">
                <h5 className="text-xs font-medium text-gray-600">Spacing</h5>
                <div className="flex items-center gap-1">
                    <div
                        className="bg-blue-200 rounded"
                        style={{
                            width: 'var(--spacing-sm, 0.5rem)',
                            height: 'var(--spacing-sm, 0.5rem)'
                        }}
                    ></div>
                    <span className="text-xs text-gray-500">Small</span>

                    <div
                        className="bg-blue-300 rounded ml-2"
                        style={{
                            width: 'var(--spacing-md, 1rem)',
                            height: 'var(--spacing-md, 1rem)'
                        }}
                    ></div>
                    <span className="text-xs text-gray-500">Medium</span>

                    <div
                        className="bg-blue-400 rounded ml-2"
                        style={{
                            width: 'var(--spacing-lg, 1.5rem)',
                            height: 'var(--spacing-lg, 1.5rem)'
                        }}
                    ></div>
                    <span className="text-xs text-gray-500">Large</span>
                </div>
            </div>
        </div>
    );
}
