import { describe, it, expect } from 'vitest';
import { ModalDialog } from '../ModalDialog';
import { SlideOverDrawer } from '../SlideOverDrawer';
import { InfoTooltip } from '../InfoTooltip';
import { Tabs } from '../Tabs';
import { Input } from '../Input';
import { SearchInput } from '../SearchInput';
import { PaginationBar } from '../PaginationBar';
import { ResizableTh } from '../ResizableTh';

describe('Mobile-responsive web UI primitives', () => {
  it('exports all updated mobile-responsive web primitives', () => {
    expect(ModalDialog).toBeDefined();
    expect(SlideOverDrawer).toBeDefined();
    expect(InfoTooltip).toBeDefined();
    expect(Tabs).toBeDefined();
    expect(Input).toBeDefined();
    expect(SearchInput).toBeDefined();
    expect(PaginationBar).toBeDefined();
    expect(ResizableTh).toBeDefined();
  });
});
