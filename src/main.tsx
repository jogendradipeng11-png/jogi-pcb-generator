import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard performance.measure against browser DataCloneError / out of memory errors in heavy simulations
if (typeof window !== 'undefined' && window.performance && typeof window.performance.measure === 'function') {
  const originalMeasure = window.performance.measure.bind(window.performance);
  window.performance.measure = function (measureName: string, startOrMeasureOptions?: string | PerformanceMeasureOptions, endMark?: string) {
    try {
      return originalMeasure(measureName, startOrMeasureOptions as any, endMark);
    } catch {
      // Gracefully prevent browser crash when performance timing entries exceed capacity
      return undefined as any;
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <App />
);
