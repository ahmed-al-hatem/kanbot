import { lazy } from 'react';

/**
 * The summary card for the sprint page, loaded with its first render so react-markdown stays out
 * of the page chunks too (plan §5.4).
 */
export const SprintSummaryCard = lazy(async () => {
  const { SprintSummaryCard: Component } = await import('./SprintSummaryCard');
  return { default: Component };
});

/** The board's summary dialog (header "Summarize"), loaded on its first open. */
export const SprintSummaryDialog = lazy(async () => {
  const { SprintSummaryDialog: Component } = await import('./SprintSummaryDialog');
  return { default: Component };
});
