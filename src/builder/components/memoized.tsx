import React, { memo } from 'react';
import { Button as OriginalButton } from './Button';
import { TextField as OriginalTextField } from './TextField';
import { Select as OriginalSelect } from './Select';

// Memoized Button component
export const Button = memo(OriginalButton);

// Memoized TextField component  
export const TextField = memo(OriginalTextField);

// Memoized Select component
export const Select = memo(OriginalSelect);

// Export other commonly used components as memoized versions
export { Button as MemoizedButton, TextField as MemoizedTextField, Select as MemoizedSelect };