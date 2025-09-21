import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Tree, TreeItem } from '../builder/components/Tree';

const meta: Meta<typeof Tree> = {
  title: 'Tree',
  component: Tree,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    selectionMode: 'multiple'
  }
};

export default meta;

type Story = StoryObj<typeof Tree>;

export const Basic: Story = {
  render: (args) => (
    <Tree {...args} aria-label="Project navigator" className="w-[280px]">
      <TreeItem id="getting-started" title="Getting Started" hasChildren childItems={(
        <>
          <TreeItem id="overview" title="Overview" />
          <TreeItem id="quickstart" title="Quickstart" />
        </>
      )} />
      <TreeItem id="guides" title="Guides" hasChildren childItems={(
        <>
          <TreeItem id="styling" title="Styling" />
          <TreeItem id="routing" title="Routing" />
          <TreeItem id="state" title="State Management" />
        </>
      )} />
      <TreeItem id="api" title="API Reference" />
    </Tree>
  )
};

export const WithActions: Story = {
  render: (args) => (
    <Tree {...args} aria-label="Folders" className="w-[280px]">
      <TreeItem
        id="projects"
        title="Projects"
        hasChildren
        onInfoClick={action('projects-info-click')}
        childItems={(
          <>
            <TreeItem id="project-alpha" title="Alpha" />
            <TreeItem id="project-beta" title="Beta" />
          </>
        )}
      />
      <TreeItem
        id="archive"
        title="Archive"
        hasChildren
        childItems={<TreeItem id="old" title="2019" />}
      />
    </Tree>
  )
};
