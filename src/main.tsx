import React from 'react';import {LanguageProvider} from './i18n';import {createRoot} from 'react-dom/client';import {App} from './App';import './style.css';
if('scrollRestoration' in history)history.scrollRestoration='manual';
createRoot(document.getElementById('root')!).render(<React.StrictMode><LanguageProvider><App/></LanguageProvider></React.StrictMode>);
