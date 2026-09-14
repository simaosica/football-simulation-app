// app/start/components/Pitch.tsx
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Player from './player';
import { PitchProps } from './uiTypes';
import styles from './page.module.css';
import { PITCH_WIDTH, PITCH_LENGTH } from '@/engine/core/geometry';

export default function Pitch({mainPlayers, opponentPlayers, mainRefs, opponentRefs, onPlayerStop, onOpponentStop, gameState, isSimulationMode, onEditPlayer, passDebugLines, decisionPressure}: PitchProps) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [pitchSize, setPitchSize] = useState({ width: 0, height: 0 });
  const scaleX = pitchSize.width / PITCH_WIDTH;
  const scaleY = pitchSize.height / PITCH_LENGTH;

  useEffect(() => {
    if (!pitchRef.current) return;
  
    const updateSize = () => {
      const rect = pitchRef.current!.getBoundingClientRect();
      setPitchSize({ width: rect.width, height: rect.height });
    };
  
    updateSize(); // Initial size update
    const observer = new ResizeObserver(updateSize);
    observer.observe(pitchRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={pitchRef} className={styles.pitchContainer}>
      <Image src="/pitchNew.png" alt="Football pitch" fill priority sizes="583px" style={{ objectFit: 'fill' }} draggable={false}/>

      {pitchSize.width > 0 && pitchSize.height > 0 && (
        <>
          {/* Pass Debug Overlay - START */}
          {passDebugLines && passDebugLines.length > 0 && (() => {
            return (
              <svg className={styles.debugOverlay} viewBox={`0 0 ${PITCH_WIDTH} ${PITCH_LENGTH}`} preserveAspectRatio="none" width="100%" height="100%">
                {passDebugLines.map((line, i) => (
                  <line key={i} x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke={rankToColor(line.rank)} strokeWidth={0.5}/>
                ))}
              </svg>
            );
          })()}

          {/* DECISION PRESSURE DEBUG */}
          {decisionPressure !== null && gameState && gameState.ball.holderIndex !== null && gameState.ball.target === null && (
            <div
              style={{
                position: "absolute",
                left: `${gameState.ball.x * scaleX}px`,
                top: `${(gameState.ball.y + 1.5) * scaleY}px`,
                transform: "translate(-50%, -50%)",
                background: "rgba(0,0,0,0.7)",
                color: "white",
                fontSize: "11px",
                fontWeight: "bold",
                padding: "2px 4px",
                borderRadius: "4px",
                pointerEvents: "none",
                zIndex: 30,
              }}
            >
              {decisionPressure != null && (
                <div> {decisionPressure.toFixed(2)} </div>
              )}
            </div>
          )}
          {/* Pass Debug Overlay - END */}
        
        
          {mainPlayers.map((pos, i) => (
            <Player key={i} index={i} pos={pos}
              pitchSize={pitchSize}
              onStop={isSimulationMode ? () => {} : onPlayerStop}
              playerRef={mainRefs[i]}
              isSimulationMode={isSimulationMode}
              onEdit={onEditPlayer}
            />
          ))}

          {opponentPlayers.map((pos, i) => (
            <Player key={`opp-${i}`} index={i} pos={pos} pitchSize={pitchSize}
              onStop={isSimulationMode ? () => {} : onOpponentStop}
              playerRef={opponentRefs[i]}
              isOpponent
              isSimulationMode={isSimulationMode}
            />
          ))}

          {/* Highlight player with ball */}
          {gameState && (
            <div className={styles.activePlayerMarker}
              style={{
                left: `${gameState.ball.x * scaleX}px`,
                top: `${(gameState.ball.y - 2) * scaleY}px`,
                transform: "translate(-50%, -50%)"
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

// Helper functions for Pass Debug Overlay
function rankToColor(rank: 0 | 1 | 2) {
  switch (rank) {
    case 0: return "#2BFF00"; // green
    case 1: return "#E5F734"; // yellow
    case 2: return "#FF2F00"; // red
  }
}