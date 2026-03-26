import { useEffect, lazy, Suspense } from 'react';
import useGameStore from './store/useGameStore';
import SplashScreen from './components/SplashScreen';
import Menu from './components/Menu';

const GameScene = lazy(() => import('./scenes/GameScene'));

function App() {
  const { splashDone, gameStarted } = useGameStore();

  return (
    <>
      {/* Grain overlay — always present */}
      <div className="grain-overlay" />

      {/* Splash Screen */}
      {!splashDone && <SplashScreen />}

      {/* Main Menu */}
      {splashDone && !gameStarted && <Menu />}

      {/* 3D Game World */}
      {gameStarted && (
        <Suspense fallback={<div style={{ background: '#000', width: '100vw', height: '100vh' }} />}>
          <GameScene />
        </Suspense>
      )}
    </>
  );
}

export default App;
