import React from 'react';
import { AppProvider } from './context/AppContext';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <AppProvider>
      <HomePage />
    </AppProvider>
  );
}
