import { Button } from '../../../../shared/components/Button';
import { TextField } from '../../../../shared/components/TextField';
import { Select, SelectItem } from '../../../../shared/components/Select';
import { Slider } from '../../../../shared/components/Slider';
import { Checkbox } from '../../../../shared/components/Checkbox';
import { RadioGroup } from '../../../../shared/components/RadioGroup';
import { Radio } from '../../../../shared/components/Radio';
import { Calendar } from '../../../../shared/components/Calendar';
import { DatePicker } from '../../../../shared/components/DatePicker';
import { DateRangePicker } from '../../../../shared/components/DateRangePicker';
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components';
import { Input } from 'react-aria-components';
import './ThemePreview.css';

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
        <div className="theme-preview-container">
            {/* Buttons */}
            <div className="preview-category">
                <h5 className="preview-category-title">Buttons</h5>
                <div className="preview-category-content">
                    <Button>Primary Button</Button>
                    <Button>
                        <span className="styled-button-text">
                            Styled Button
                        </span>
                    </Button>
                    <Button isDisabled>Disabled Button</Button>
                </div>
            </div>

            {/* Form Elements */}
            <div className="preview-category">
                <h5 className="preview-category-title">Form Elements</h5>
                <div className="preview-category-form">
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
            <div className="preview-category">
                <h5 className="preview-category-title">Checkboxes</h5>
                <div className="preview-category-form">
                    <Checkbox defaultSelected>Checked Option</Checkbox>
                    <Checkbox>Unchecked Option</Checkbox>
                    <Checkbox isIndeterminate>Indeterminate Option</Checkbox>
                    <Checkbox isDisabled>Disabled Option</Checkbox>
                </div>
            </div>

            {/* Radio Groups */}
            <div className="preview-category">
                <h5 className="preview-category-title">Radio Groups</h5>
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
            <div className="preview-category">
                <h5 className="preview-category-title">Tabs</h5>
                <Tabs defaultSelectedKey="tab1">
                    <TabList>
                        <Tab id="tab1">First Tab</Tab>
                        <Tab id="tab2">Second Tab</Tab>
                        <Tab id="tab3">Third Tab</Tab>
                    </TabList>
                    <TabPanel id="tab1">
                        <div className="preview-tab-content">
                            Content for the first tab goes here.
                        </div>
                    </TabPanel>
                    <TabPanel id="tab2">
                        <div className="preview-tab-content">
                            Content for the second tab goes here.
                        </div>
                    </TabPanel>
                    <TabPanel id="tab3">
                        <div className="preview-tab-content">
                            Content for the third tab goes here.
                        </div>
                    </TabPanel>
                </Tabs>
            </div>

            {/* Typography Examples */}
            <div className="preview-category">
                <h5 className="preview-category-title">Typography</h5>
                <div className="preview-typography">
                    <h1 className="preview-heading-1">
                        Heading 1
                    </h1>
                    <h2 className="preview-heading-2">
                        Heading 2
                    </h2>
                    <p className="preview-body-text">
                        Body text example with normal font weight and readable color.
                    </p>
                    <a
                        href="#"
                        className="preview-link"
                        onClick={(e) => e.preventDefault()}
                    >
                        Link example
                    </a>
                </div>
            </div>

            {/* Status Indicators */}
            <div className="preview-category">
                <h5 className="preview-category-title">Status & Badges</h5>
                <div className="preview-category-content">
                    <span className="preview-badge preview-badge-primary">
                        Primary
                    </span>
                    <span className="preview-badge preview-badge-success">
                        Success
                    </span>
                    <span className="preview-badge preview-badge-warning">
                        Warning
                    </span>
                    <span className="preview-badge preview-badge-danger">
                        Danger
                    </span>
                </div>
            </div>

            {/* Cards & Surfaces */}
            <div className="preview-category">
                <h5 className="preview-category-title">Cards & Surfaces</h5>
                <div className="preview-cards-grid">
                    <div className="preview-card">
                        <h6 className="preview-card-title">
                            Card Title
                        </h6>
                        <p className="preview-card-body">
                            Card content here.
                        </p>
                    </div>
                    <div className="preview-card preview-card-featured">
                        <h6 className="preview-card-title">
                            Featured Card
                        </h6>
                        <p className="preview-card-body">
                            Primary colored card.
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress & Loading */}
            <div className="preview-category">
                <h5 className="preview-category-title">Progress</h5>
                <div className="preview-progress-section">
                    <div className="preview-progress-wrapper">
                        <span className="preview-progress-label">
                            Progress: 65%
                        </span>
                        <div className="preview-progress-track">
                            <div
                                className="preview-progress-bar"
                                style={{ width: '65%' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacing Visualization */}
            <div className="preview-category">
                <h5 className="preview-category-title">Spacing</h5>
                <div className="preview-spacing-grid">
                    <div className="preview-spacing-item">
                        <div className="preview-spacing-box preview-spacing-sm"></div>
                        <span className="preview-spacing-label">Small</span>
                    </div>
                    <div className="preview-spacing-item">
                        <div className="preview-spacing-box preview-spacing-md"></div>
                        <span className="preview-spacing-label">Medium</span>
                    </div>
                    <div className="preview-spacing-item">
                        <div className="preview-spacing-box preview-spacing-lg"></div>
                        <span className="preview-spacing-label">Large</span>
                    </div>
                </div>
            </div>

            {/* DatePicker */}
            <div className="preview-category">
                <h5 className="preview-category-title">Date Picker</h5>
                <DatePicker
                    label="Select Date"
                    description="Choose a date from the picker"
                    placeholder="Pick a date..."
                    showCalendarIcon={true}
                    allowClear={true}
                />
            </div>

            {/* DateRangePicker */}
            <div className="preview-category">
                <h5 className="preview-category-title">Date Range Picker</h5>
                <DateRangePicker
                    label="Select Date Range"
                    description="Choose start and end dates"
                    placeholder="Pick date range..."
                    showCalendarIcon={true}
                    allowClear={true}
                />
            </div>

            {/* Calendar */}
            <div className="preview-category">
                <h5 className="preview-category-title">Calendar</h5>
                <Calendar
                    aria-label="Date Selection"
                    visibleDuration={{ months: 1 }}
                />
            </div>
        </div>
    );
}
