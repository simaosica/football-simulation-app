// app/start/startPageClient.tsx
'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Play, Pause } from "lucide-react";
import { useLanguage } from '../i18n/languageContext';
import styles from './page.module.css';
import modalStyles from '@/app/components/modal/modal.module.css';
import Modal from '@/app/components/modal/modal';
import { PlayerState, AppStep, TacticalProfile } from '@/engine/models/types';
import { getRoleFromPosition, formationLayouts, opponentFormationLayouts, PLAYER_PROFILE_CATALOG } from '@/engine/models/constants';
import Pitch from './pitch';
import useFormationManager from './useFormationManager';
import TacticalIdeasPanel from '../tacticsMode/tacticalPanel';
import useSimulationController from './useSimulationController';
import { formationsEqual } from './formationUtils';


// Main Start Page Component
export default function StartPage() {
  const { status, data: session } = useSession();
  const { t, ready } = useLanguage();
  const formations = ['4-3-3', '4-4-2'] as const satisfies readonly (keyof typeof formationLayouts)[];
  const opponentFormations = ['4-4-2'] as const satisfies readonly (keyof typeof opponentFormationLayouts)[];
  const [appStep, setAppStep] = useState<AppStep>("SETUP");
  const {
    setFormation: setMainTeamFormation,
    players: mainPlayers,
    setPlayers: setMainPlayers,
    refs: mainRefs,
    setMoved: setPlayerMoved,
    currentLoaded: currentLoadedFormation,
    savedFormations,
    loadSavedFormation,
    saveFormation,
    deleteSavedFormation,
  } = useFormationManager(formationLayouts, "MAIN", "4-3-3", status)
  const {
    setFormation: setOpponentTeamFormation,
    players: opponentPlayers,
    setPlayers: setOpponentPlayers,
    refs: opponentRefs,
    setMoved: setOpponentPlayerMoved,
    currentLoaded: currentLoadedOpponentFormation,
    savedFormations: savedOpponentFormations,
    loadSavedFormation: loadSavedOpponentFormation,
    saveFormation: saveOpponentFormation,
    deleteSavedFormation: deleteSavedOpponentFormation,
  } = useFormationManager(opponentFormationLayouts, "OPPONENT", "4-4-2", status);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newFormationName, setNewFormationName] = useState('');
  const saveInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formationToDelete, setFormationToDelete] = useState<number | null>(null);
  const [nameWarning, setNameWarning] = useState('');
  const [showSaveOpponentModal, setShowSaveOpponentModal] = useState(false);
  const [newOpponentFormationName, setNewOpponentFormationName] = useState('');
  const [opponentNameWarning, setOpponentNameWarning] = useState('');
  const opponentSaveInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteOpponentModal, setShowDeleteOpponentModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [opponentFormationToDelete, setOpponentFormationToDelete] = useState<number | null>(null);



  const isSetupMode = appStep === "SETUP";
  const isTacticsMode = appStep === "TACTICS";
  const isSimulationMode = appStep === "SIMULATION";
  const [tacticalProfile, setTacticalProfile] = useState<TacticalProfile>({
    buildUpSide: 0,
    tempo: "NORMAL",
    risk: "MEDIUM",
    maxPasses: 10
  });

  const {
    gameState,
    isPlaying,
    isPaused,
    simulationFinished,
    simulationEndMessageKey,
    useSameVariation,
    setUseSameVariation,
    currentRunSeed,
    showPassDebug,
    setShowPassDebug,
    passDebugLines,
    decisionPressureDebug,
    startDynamicPlay,
    resetDynamicPlay,
    togglePausePlay,
    resetSimulationSession,
  } = useSimulationController({
    mainPlayers,
    opponentPlayers,
    tacticalProfile,
  });

  const [editingPlayerIndex, setEditingPlayerIndex] = useState<number | null>(null);
  const [originalRole, setOriginalRole] = useState<PlayerState["role"] | null>(null);
  const [originalPosition, setOriginalPosition] = useState<PlayerState["position"] | null>(null);
  const [originalProfile, setOriginalProfile] = useState<PlayerState["profile"] | null>(null);
  const [originalShirtNumber, setOriginalShirtNumber] = useState<number | null>(null);

  // On initial load, check if we need to prompt for password setup
  useEffect(() => {
    if (!session || status !== "authenticated") return;
  
    const alreadyShown = sessionStorage.getItem("passwordPromptShown");
    if (alreadyShown) return;
  
    fetch("/api/user/auth-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.needsPasswordSetup) {
          setShowPasswordModal(true);
          sessionStorage.setItem("passwordPromptShown", "true");
        }
      });
  }, [session, status]);
  

  // Open save modal and focus input
  const handleSaveFormation = () => {
    setNewFormationName(''); // reset input
    setNameWarning(''); // reset warning
    setShowSaveModal(true);
    setTimeout(() => { saveInputRef.current?.focus(); }, 0);
  };

  // Open save opponent modal and focus input
  const handleSaveOpponentFormation = () => {
    setNewOpponentFormationName(''); // reset input
    setOpponentNameWarning(''); // reset warning
    setShowSaveOpponentModal(true);
    setTimeout(() => { opponentSaveInputRef.current?.focus(); }, 0);
  };

  // Handle editing player position
  const handleEditPlayer = (index: number) => {
    if (!isSetupMode) return;
    setOriginalRole(mainPlayers[index].role);
    setOriginalPosition(mainPlayers[index].position);
    setOriginalProfile(mainPlayers[index].profile);
    setOriginalShirtNumber(mainPlayers[index].shirtNumber);
    setEditingPlayerIndex(index);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setFormationToDelete(null);
    setNameWarning('');
  };

  const closeDeleteOpponentModal = () => {
    setShowDeleteOpponentModal(false);
    setOpponentFormationToDelete(null);
    setOpponentNameWarning('');
  };

  const closeSaveModal = () => {
    setShowSaveModal(false);
    setNewFormationName('');
    setNameWarning('');
  };

  const closeSaveOpponentModal = () => {
    setShowSaveOpponentModal(false);
    setNewOpponentFormationName('');
    setOpponentNameWarning('');
  };

  const closeEditPlayerModal = () => {
    if (editingPlayerIndex !== null && originalPosition !== null && originalRole !== null &&
      originalProfile !== null && originalShirtNumber !== null
    ) {
      const reverted = [...mainPlayers];
      reverted[editingPlayerIndex] = {
        ...reverted[editingPlayerIndex],
        position: originalPosition,
        role: originalRole,
        profile: originalProfile,
        shirtNumber: originalShirtNumber,
      };
      setMainPlayers(reverted);
    }
    setEditingPlayerIndex(null);
    setOriginalPosition(null);
    setOriginalRole(null);
    setOriginalProfile(null);
    setOriginalShirtNumber(null);
  } 

  const allMainTeamFormations = useMemo(() => {
    return [
      ...formations.map(f => formationLayouts[f]), // base formations
      ...savedFormations.map(f => f.players) // saved formations
    ];
  }, [formations, savedFormations]);

  const allOpponentTeamFormations = useMemo(() => {
    return [
      ...opponentFormations.map(f => opponentFormationLayouts[f]), // base formations
      ...savedOpponentFormations.map(f => f.players) // saved formations
    ];
  }, [opponentFormations, savedOpponentFormations]);

  const positionsChanged = useMemo(() => {
    if (editingPlayerIndex !== null) return false;

    const matchesExisting = allMainTeamFormations.some(existing => formationsEqual(mainPlayers, existing));
    return !matchesExisting; // You can save only if it matches NONE
  }, [mainPlayers, allMainTeamFormations, editingPlayerIndex]);
  
  const opponentPlayersChanged = useMemo(() => {
    if (editingPlayerIndex !== null) return false;

    const matchesExisting = allOpponentTeamFormations.some(existing => formationsEqual(opponentPlayers, existing));
    return !matchesExisting; // You can save only if it matches NONE
  }, [opponentPlayers, allOpponentTeamFormations, editingPlayerIndex]);

  const isGK = editingPlayerIndex !== null && mainPlayers[editingPlayerIndex].position === "GK";

  if (status === "loading") return null;
  if (!ready) return null;
  return (
    <div className={styles.pageWrapper}>
      {/* Football Field */}
      {!isTacticsMode &&<div className={styles.fieldWrapper}>
        <Pitch
          mainPlayers={isSimulationMode ? gameState.mainPlayers : mainPlayers}
          opponentPlayers={isSimulationMode ? gameState.opponentPlayers : opponentPlayers}          
          mainRefs={mainRefs}
          opponentRefs={opponentRefs}
          onPlayerStop={(index, x, y) => {
            const updated = [...mainPlayers];
            updated[index] = { ...updated[index], x, y };
            setMainPlayers(updated);
            setPlayerMoved(true);
          }}
          onOpponentStop={(index, x, y) => {
            const updated = [...opponentPlayers];
            updated[index] = { ...updated[index], x, y };
            setOpponentPlayers(updated);
            setOpponentPlayerMoved(true);
          }}
          gameState={isSimulationMode ? gameState : null}
          isSimulationMode={isSimulationMode}
          onEditPlayer={handleEditPlayer}
          passDebugLines={showPassDebug ? passDebugLines : []} // pass debug lines
          decisionPressure={showPassDebug ? decisionPressureDebug : null} // decision pressure debug
        />
      </div>}

      {isSimulationMode && (
        <div className={styles.simulationButtons}>
          <button className={styles.startPlayButton}
            onClick={startDynamicPlay}
            disabled={isPlaying || isPaused || simulationFinished}
          >
            {t.startPlay}
          </button>

          <label className={styles.replayToggle}>
            <span className={styles.replayText}>{t.repeatPlay}</span>

            <span className={styles.switch}>
              <input
                type="checkbox"
                checked={useSameVariation}
                onChange={(e) => setUseSameVariation(e.target.checked)}
                disabled={currentRunSeed === null || isPlaying}
              />
              <span className={styles.slider}></span>
            </span>
          </label>
      
          <button className={styles.resetPlayButton}
            onClick={resetDynamicPlay}
            disabled={!isPlaying && !isPaused && !simulationFinished}
          >
            {t.resetPlay}
          </button>
      
          <div className={styles.debugControls}>
            <button className={`${styles.debugButton} ${showPassDebug ? styles.debugButtonActive : ''}`}
              onClick={() => setShowPassDebug(v => !v)}
            >
              {t.analysisMode}
            </button>
      
            <button className={styles.pauseResumeButton}
              onClick={togglePausePlay}
              disabled={simulationFinished || (!isPlaying && !isPaused)}
              aria-label={isPaused ? "Resume play" : "Pause play"}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          </div>

          <div className={styles.simulationOutcomeSlot}>
            {simulationFinished && simulationEndMessageKey && (
              <div className={styles.simulationOutcome}>
                {t[simulationEndMessageKey]}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formation Selection */}
      {isSetupMode && (
        <>
          <div className={styles.formationSection}>
            <h1 className={styles.heading}>{t.chooseFormation}</h1>
            <div className={styles.formationButtons}>
              {/* Predefined formations */}
              {formations.map((formation) => (
                <button key={formation}
                  onClick={() => {
                    setMainTeamFormation(formation);
                  }}
                  className={`${styles.formationButton} ${
                    formationsEqual(mainPlayers, formationLayouts[formation])
                      ? styles.formationButtonSelected
                      : ''
                  }`}
                >{formation}</button>
              ))}

              {/* Saved formations */}
              {savedFormations.map((f, index) => (
                <div key={`saved-${index}`} className={styles.savedFormationRow}>
                  <button onClick={() => loadSavedFormation(f)}
                    className={`${styles.formationButton} ${
                      formationsEqual(mainPlayers, f.players)
                        ? styles.formationButtonSelected
                        : ''
                    }`}
                  >{f.name}</button>

                  <button className={styles.deleteButton}
                    onClick={() => {
                      setFormationToDelete(index);
                      setShowDeleteModal(true);
                    }}
                  >✕</button>

                </div>
              ))}
            </div>
                
            {/* Divider */}
            <div className={styles.divider}></div>
                
            {/* Reset Button */}
            <button className={styles.resetButton} disabled={!positionsChanged}
              onClick={() => setMainPlayers(currentLoadedFormation)}
            >{t.resetChanges}</button>

            <button className={styles.saveButton} disabled={!positionsChanged}
              onClick={handleSaveFormation}
            >{t.saveChanges}</button>
          </div>
                
          {/* Opponent Formation Selection */}
          <div className={styles.formationSection}>
            <h1 className={styles.heading}>{t.chooseOpponentFormation}</h1>
            <div className={styles.formationButtons}>
              {/* Predefined formations */}
              {opponentFormations.map((formation) => (
                <button key={`opp-${formation}`}
                  onClick={() => {
                    setOpponentTeamFormation(formation);
                  }}
                  className={`${styles.formationButton} ${
                    formationsEqual(opponentPlayers, opponentFormationLayouts[formation])
                      ? styles.formationButtonSelected
                      : ''
                  }`}
                >{formation}</button>
              ))}

              {/* Saved opponent formations */}
              {savedOpponentFormations.map((f, index) => (
                <div key={`opp-saved-${index}`} className={styles.savedFormationRow}>
                  <button onClick={() => loadSavedOpponentFormation(f)}
                    className={`${styles.formationButton} ${
                      formationsEqual(opponentPlayers, f.players)
                        ? styles.formationButtonSelected
                        : ''
                    }`}
                  >{f.name}</button>

                  <button className={styles.deleteButton}
                    onClick={() => {
                      setOpponentFormationToDelete(index);
                      setShowDeleteOpponentModal(true);
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
                
            {/* Divider */}
            <div className={styles.divider}></div>
                
            {/* Reset Button */}
            <button className={styles.resetButton} disabled={!opponentPlayersChanged}
              onClick={() => setOpponentPlayers(currentLoadedOpponentFormation)}
            >{t.resetChanges}</button>

            <button className={styles.saveButton} disabled={!opponentPlayersChanged}
              onClick={handleSaveOpponentFormation}
            >{t.saveChanges}</button>
          </div>
        </ >
      )}

      <Modal open={showPasswordModal}>
        <p>{t.setPasswordPrompt}</p>

        <input type="password" className={modalStyles.modalInput} placeholder="Password must be 8-12 characters long." value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setPasswordError(null);
          }}
        />

        {passwordError && (
          <p className={modalStyles.warningText}>
            {passwordError}
          </p>
        )}

        <div className={modalStyles.modalActions}>
          <button className={modalStyles.confirmButtonSave}
            onClick={async () => {
              if (newPassword.length < 8 || newPassword.length > 12) {
                setPasswordError("Password must be 8-12 characters long.");
                return;
              }
            
              const res = await fetch("/api/user/set-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: newPassword }),
              });
            
              const data = await res.json();
            
              if (data.error) {
                setPasswordError(data.error);
                return;
              }
            
              setShowPasswordModal(false);
              setNewPassword("");
              setPasswordError(null);
            }}
          >
            {t.save}
          </button>
          
          <button className={modalStyles.cancelButton}
            onClick={() => {
              setShowPasswordModal(false);
              setNewPassword("");
              setPasswordError(null);
            }}
          >
            {t.maybeLater}
          </button>
        </div>
      </Modal>

      <Modal open={showDeleteModal}>
        <p>
          {t.deleteFormationQuestion} <br/> &quot;
          {formationToDelete !== null ? savedFormations[formationToDelete].name : ''}&quot;?
        </p>
          
        <div className={modalStyles.modalActions}>
          <button className={modalStyles.confirmButtonDelete}
            onClick={async () => {
              if (formationToDelete === null) return;
            
              const shouldFallback = formationsEqual(mainPlayers, savedFormations[formationToDelete].players);
            
              await deleteSavedFormation(formationToDelete);
            
              if (shouldFallback) {
                setMainTeamFormation('4-3-3');
              }
            
              closeDeleteModal();
            }}
          >
            {t.delete}
          </button>
          
          <button className={modalStyles.cancelButton} onClick={closeDeleteModal}>
            {t.cancel}
          </button>
        </div>
      </Modal>


      <Modal open={showDeleteOpponentModal}>
        <p>
          {t.deleteFormationQuestion}<br/>&quot;
          {opponentFormationToDelete !== null ? savedOpponentFormations[opponentFormationToDelete].name : ''}&quot;?
        </p>
          
        <div className={modalStyles.modalActions}>
          <button className={modalStyles.confirmButtonDelete}
            onClick={async () => {
              if (opponentFormationToDelete === null) return;
            
              const shouldFallback = formationsEqual(opponentPlayers, savedOpponentFormations[opponentFormationToDelete].players);
            
              await deleteSavedOpponentFormation(opponentFormationToDelete);
            
              if (shouldFallback) {
                setOpponentTeamFormation('4-4-2');
              }
            
              closeDeleteOpponentModal();
            }}
          >
            {t.delete}
          </button>
          
          <button className={modalStyles.cancelButton} onClick={closeDeleteOpponentModal}>
            {t.cancel}
          </button>
        </div>
      </Modal>


      <Modal open={showSaveModal}>
        <p>{t.enterNameText}</p>

        <input className={modalStyles.modalInput} ref={saveInputRef} type="text" value={newFormationName}
          onChange={(e) => {
            const value = e.target.value.toUpperCase();
            setNewFormationName(value);
          
            const baseFormations = ["4-3-3", "4-4-2"];
            let warning = '';
          
            if (value.length > 20) warning = t.warningNameLength;
            else {
              const exists = savedFormations.some(f => f.name.toLowerCase() === value.trim().toLowerCase()) ||
                baseFormations.some(f => f.toLowerCase() === value.trim().toLowerCase());

              if (exists) warning = t.warningNameExists;
            }
          
            setNameWarning(warning);
          }}
        />

        {nameWarning && (<p className={modalStyles.warningText}>{nameWarning}</p>)}

        <div className={modalStyles.modalActions}>
          <button className={modalStyles.confirmButtonSave} disabled={!newFormationName.trim() || !!nameWarning}
            onClick={() => {
              if (!newFormationName.trim() || nameWarning) return;
              saveFormation(newFormationName);
              closeSaveModal();
            }}
          >
            {t.save}
          </button>
          
          <button className={modalStyles.cancelButton} onClick={closeSaveModal}>
            {t.cancel}
          </button>
        </div>
      </Modal>


      <Modal open={showSaveOpponentModal}>
        <p>{t.enterNameText}</p>

        <input className={modalStyles.modalInput} ref={opponentSaveInputRef} type="text" value={newOpponentFormationName}
          onChange={(e) => {
            const value = e.target.value.toUpperCase();
            setNewOpponentFormationName(value);
          
            const baseFormations = ["4-4-2"];
            let warning = '';
          
            if (value.length > 20) warning = t.warningNameLength;
            else {
              const exists = savedOpponentFormations.some(f => f.name.toLowerCase() === value.trim().toLowerCase()) ||
                baseFormations.some(f => f.toLowerCase() === value.trim().toLowerCase());

              if (exists) warning = t.warningNameExists;
            }
          
            setOpponentNameWarning(warning);
          }}
        />

        {opponentNameWarning && (<p className={modalStyles.warningText}>{opponentNameWarning}</p>)}

        <div className={modalStyles.modalActions}>
          <button className={modalStyles.confirmButtonSave} disabled={!newOpponentFormationName.trim() || !!opponentNameWarning}
            onClick={() => {
              if (!newOpponentFormationName.trim() || opponentNameWarning) return;
              saveOpponentFormation(newOpponentFormationName);
              closeSaveOpponentModal();
            }}            
          >
            {t.save}
          </button>
          
          <button className={modalStyles.cancelButton} onClick={closeSaveOpponentModal}>
            {t.cancel}
          </button>
        </div>
      </Modal>


      <Modal open={editingPlayerIndex !== null}>
        {editingPlayerIndex !== null && (<>
          {!isGK && (<>
            <label className={modalStyles.modalLabel}>
              {t.position}
            </label>
            
            <select className={modalStyles.modalSelect} value={mainPlayers[editingPlayerIndex].position}
              onChange={(e) => {
                const newPosition = e.target.value as PlayerState["position"];
                const newRole = getRoleFromPosition(newPosition);
              
                const updated = [...mainPlayers];
                updated[editingPlayerIndex] = {
                  ...updated[editingPlayerIndex],
                  position: newPosition,
                  role: newRole,
                };
              
                setMainPlayers(updated);
                setPlayerMoved(true);
              }}
            >
              <option value="LB">{t.positions.LB}</option>
              <option value="LWB">{t.positions.LWB}</option>
              <option value="LCB">{t.positions.LCB}</option>
              <option value="CB">{t.positions.CB}</option>
              <option value="RCB">{t.positions.RCB}</option>
              <option value="RB">{t.positions.RB}</option>
              <option value="RWB">{t.positions.RWB}</option>
              <option value="CDM">{t.positions.CDM}</option>
              <option value="LCDM">{t.positions.LCDM}</option>
              <option value="RCDM">{t.positions.RCDM}</option>
              <option value="CM">{t.positions.CM}</option>
              <option value="LCM">{t.positions.LCM}</option>
              <option value="RCM">{t.positions.RCM}</option>
              <option value="LM">{t.positions.LM}</option>
              <option value="RM">{t.positions.RM}</option>
              <option value="CAM">{t.positions.CAM}</option>
              <option value="LCAM">{t.positions.LCAM}</option>
              <option value="RCAM">{t.positions.RCAM}</option>
              <option value="LW">{t.positions.LW}</option>
              <option value="RW">{t.positions.RW}</option>
              <option value="ST">{t.positions.ST}</option>
              <option value="LST">{t.positions.LST}</option>
              <option value="RST">{t.positions.RST}</option>
            </select>
          </>)}

          <label className={modalStyles.modalLabel}>
            {t.shirtNumber}
          </label>
        
          <select className={modalStyles.modalSelect} value={mainPlayers[editingPlayerIndex].shirtNumber}
            onChange={(e) => {
              const newNumber = Number(e.target.value);
            
              const updated = [...mainPlayers];
              updated[editingPlayerIndex] = {
                ...updated[editingPlayerIndex],
                shirtNumber: newNumber,
              };
            
              setMainPlayers(updated);
              setPlayerMoved(true);
            }}
          >
            {Array.from({ length: 99 }, (_, i) => i + 1).filter((num) =>
              num === mainPlayers[editingPlayerIndex].shirtNumber ||
              !mainPlayers.some((p, idx) => idx !== editingPlayerIndex && p.shirtNumber === num)
              ).map((num) => (<option key={num} value={num}>{num}</option>))}
            </select>
              
          <label className={modalStyles.modalLabel}>
            {t.profile}
          </label>
              
          <select className={modalStyles.modalSelect}
            value={ Object.entries(PLAYER_PROFILE_CATALOG).find(([, profile]) =>
              profile.name === mainPlayers[editingPlayerIndex].profile.name)?.[0] ?? "DEFAULT"}
            onChange={(e) => {
              const profileKey = e.target.value as keyof typeof PLAYER_PROFILE_CATALOG;
            
              const updated = [...mainPlayers];
              updated[editingPlayerIndex] = {
                ...updated[editingPlayerIndex],
                profile: PLAYER_PROFILE_CATALOG[profileKey],
              };
            
              setMainPlayers(updated);
              setPlayerMoved(true);
            }}
          >
            {Object.entries(PLAYER_PROFILE_CATALOG).map(([key, profile]) => (<option key={key} value={key}>{t.profiles[profile.name]}</option>))}
          </select>
            
          <div className={modalStyles.modalActions}>
            <button className={modalStyles.confirmButtonSave}
              disabled={originalPosition === mainPlayers[editingPlayerIndex].position &&
                originalProfile === mainPlayers[editingPlayerIndex].profile &&
                originalShirtNumber ===mainPlayers[editingPlayerIndex].shirtNumber}
              onClick={() => {
                setEditingPlayerIndex(null);
                setOriginalPosition(null);
              }}
            >
              {t.save}
            </button>
            
            <button className={modalStyles.cancelButton} onClick={closeEditPlayerModal}>
              {t.cancel}
            </button>
          </div>
        </>)}
      </Modal>

      <Modal open={showLogoutModal}>
        <p>{t.logoutQuestion}</p>

        <div className={modalStyles.modalActions}>
          <button className={modalStyles.confirmButtonSave}
            onClick={() => {
              sessionStorage.removeItem("passwordPromptShown");
              setShowLogoutModal(false);
              signOut({ callbackUrl: "/" });
            }}
          >
            {t.confirm}
          </button>
          
          <button className={modalStyles.cancelButton} onClick={() => setShowLogoutModal(false)}>
            {t.cancel}
          </button>
        </div>
      </Modal>

      {isTacticsMode && (
        <div className={styles.tacticsWrapper}>
          <TacticalIdeasPanel
            tacticalProfile={tacticalProfile}
            onChange={setTacticalProfile}
          />
        </div>
      )}

      <div className={styles.actionButtons}>
        <button className={styles.returnButton}
          onClick={() => {
            if (isSimulationMode) resetDynamicPlay();
            if (isSetupMode) setShowLogoutModal(true);
            else setAppStep("SETUP");
          }}
        >
          {isSetupMode ? t.logout : t.return}
        </button>

        {(isSetupMode || isTacticsMode) && (
          <button className={styles.continueButton}
            onClick={() => {
              if (isSetupMode) setAppStep("TACTICS");
              else if (isTacticsMode){
                resetSimulationSession();
                setAppStep("SIMULATION");
              }
            }}
          >
            {t.continue}
          </button>
        )}
      </div>
    </div>
  );
}