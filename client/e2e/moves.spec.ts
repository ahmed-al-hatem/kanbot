import { expect, test } from '@playwright/test';
import {
  card,
  column,
  nextMove,
  openSignedIn,
  pointerDrag,
  projectWithActiveSprint,
  registerViaApi,
  SAMPLE_TODOS,
} from './support';

// What the unit tests can't cover (jsdom has no layout for dnd-kit): real pointer drags.

test('backlog: a pointer drag reorders, and the order survives a reload (BL-5)', async ({
  page,
  request,
}) => {
  const { api } = await registerViaApi(request);
  const project = await api.project('E2E Backlog');
  const [first, second, third] = await api.todos(project.id, SAMPLE_TODOS);
  if (!first || !second || !third) throw new Error('setup: three todos expected');

  await openSignedIn(page, api.token, `/projects/${project.id}/backlog`);
  const rows = page.getByRole('list', { name: 'Backlog todos' }).getByRole('listitem');
  await expect(rows).toHaveText([
    new RegExp(first.title),
    new RegExp(second.title),
    new RegExp(third.title),
  ]);

  // Drag the third row by its handle onto the first one.
  const moved = nextMove(page);
  await pointerDrag(page, page.getByRole('button', { name: `Drag ${third.key}` }), rows.first());
  const response = await moved;
  expect(response.ok()).toBe(true);
  expect(response.request().postDataJSON()).toMatchObject({ position: 0 });

  const reordered = [new RegExp(third.title), new RegExp(first.title), new RegExp(second.title)];
  await expect(rows).toHaveText(reordered);

  await page.reload();
  await expect(rows).toHaveText(reordered);
});

test('board: a failed move rolls back with an error toast (SPR-5)', async ({ page, request }) => {
  const { api } = await registerViaApi(request);
  const { project, todos } = await projectWithActiveSprint(api);
  const todo = todos[0];
  if (!todo) throw new Error('setup: a todo expected');

  // The server is "down" for moves only; everything else still answers.
  await page.route('**/api/todos/*/move', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' },
      }),
    }),
  );
  await openSignedIn(page, api.token, `/projects/${project.id}/board`);
  await expect(card(column(page, 'To Do'), todo.title)).toBeVisible();

  await pointerDrag(page, card(page, todo.title), column(page, 'In Progress'));

  await expect(page.getByText(new RegExp(`^Couldn't move ${todo.key}\\.`))).toBeVisible();
  await expect(card(column(page, 'To Do'), todo.title)).toBeVisible();
  await expect(column(page, 'In Progress')).toHaveAccessibleName('In Progress, 0 todos');
  await expect(page.getByRole('progressbar', { name: 'Sprint 1 todos done' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
});
