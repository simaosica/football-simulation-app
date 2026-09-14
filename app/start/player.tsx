// app/start/player.tsx
import Draggable from 'react-draggable';
import { Settings } from "lucide-react";
import styles from './page.module.css';
import { PlayerProps } from './uiTypes';
import { PITCH_LENGTH, PITCH_WIDTH } from '@/engine/core/geometry';

// Player component representing a draggable player on the pitch
export default function Player({index, pos, pitchSize, onStop, playerRef, isOpponent, isSimulationMode = false, onEdit}: PlayerProps) {
  const PLAYER_SIZE = Math.min(42, Math.max(10, pitchSize.width * 0.09));
  const R = PLAYER_SIZE / 2;
  const scaleX = pitchSize.width / PITCH_WIDTH;
  const scaleY = pitchSize.height / PITCH_LENGTH;
  return (
    <Draggable key={index} disabled={isSimulationMode} nodeRef={playerRef}
      bounds={{
        left: 0,
        top: 0,
        right: pitchSize.width - PLAYER_SIZE,
        bottom: pitchSize.height - PLAYER_SIZE,
      }}
      position={{ x: pos.x * scaleX - R, y: pos.y * scaleY - R }}
      onStop={(e, data) => {
        if (isSimulationMode) return;
      
        const xMeters = (data.x + R) / scaleX, yMeters = (data.y + R) / scaleY;
        onStop(index, xMeters, yMeters);
      }}      
    >
      <div className={styles.player} ref={playerRef}
        style={{
          width: `${PLAYER_SIZE}px`,
          boxSizing: 'border-box',
          cursor: (isSimulationMode) ? 'default' : 'grab',
          backgroundColor: isOpponent ? 'red' : undefined,
        }}
      >
        {/* EDIT BUTTON */}
        {!isSimulationMode && onEdit && (
          <button
            className={styles.editPlayerButton}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(index);
            }}
            aria-label="Edit player"
            title="Edit player"
          >
            <Settings size={14} />
          </button>
        )}
        <span className={styles.playerNumber}>{pos.shirtNumber}</span>
      </div>
    </Draggable>
  );
}