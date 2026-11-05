import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/base.css';
import './styles/motion.css';
import { Providers } from './app/Providers';
import { listenForSessionChanges } from './stores/session';
import { followSystemTheme } from './stores/theme';

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');

// Log in / log out in another tab applies here too (plan §9.2).
listenForSessionChanges();
// The OS light/dark setting is followed live until the user picks a theme with the toggle.
followSystemTheme();

createRoot(root).render(
  <StrictMode>
    <Providers />
  </StrictMode>,
);
