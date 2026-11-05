import { titleOf } from '@/lib/documentTitle';
import type { NotFoundCause } from '@/stores/notFound';

/**
 * DESIGN §9 "Variants by cause": same layout, different h1 and body. The API answers 404 both
 * for ids that don't exist and for other users' ids, so "no access" reads like "doesn't exist"
 * and the copy mentions both. Projects and todos are addressed by id (plan §2 #8), so the h1
 * can't name a key the way the canvas does.
 */
export const NOT_FOUND_COPY: Record<NotFoundCause, { title: string; body: string }> = {
  route: {
    title: "We can't find that page",
    body: 'The link may be broken, or the project or todo was moved or deleted. Check the address, or head back to somewhere you know.',
  },
  project: {
    title: "This project doesn't exist",
    body: "It may have been deleted, or it belongs to an account you're not signed in to. Check the address, or pick one of your projects.",
  },
  sprint: {
    title: "This sprint doesn't exist",
    body: 'It may have been deleted, or it belongs to another project. Check the sprint list for the one you meant.',
  },
  todo: {
    title: "This todo doesn't exist",
    body: 'It may have been deleted. Check the backlog for similar todos.',
  },
};

/** DESIGN §9: `document.title` for every cause. */
export const NOT_FOUND_TITLE = titleOf('Page not found');

/** What "Ask AI to find it" puts in the composer (DESIGN §9). Nothing is sent until the user does. */
export function findItPrompt(path: string) {
  return `I tried to open ${path} and got "Page not found". Can you help me find what I was looking for?`;
}
