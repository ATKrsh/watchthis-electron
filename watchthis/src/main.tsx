import React from 'react';
import ReactDOM from 'react-dom/client';
import AppContent from './App';
import { LibraryProvider } from './context/LibraryContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LibraryProvider>
      <AppContent />
    </LibraryProvider>
  </React.StrictMode>
);
