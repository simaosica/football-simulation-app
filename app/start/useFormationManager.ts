// app/start/hooks/useFormationManager.ts
import React, { createRef, useEffect, useRef, useState } from 'react';
import { PlayerState, FormationSlot, SavedFormation } from '@/engine/models/types';
import { normalizePlayers, createSnapshot, resetToLoaded } from "@/engine/formations/formationManager";

export default function useFormationManager(baseLayouts: Record<string, PlayerState[] | FormationSlot[]>, type: "MAIN" | "OPPONENT", initialFormation: string = Object.keys(baseLayouts)[0] as string, authStatus: string) {
  const [formation, setFormationState] = useState<string>(initialFormation);
  const [formationSlots, setFormationSlots] = useState<FormationSlot[]>(() => {
    if (type === "MAIN") {
      return (baseLayouts[initialFormation] ?? []) as FormationSlot[];
    }
  
    return [];
  });
  const [players, setPlayers] = useState<PlayerState[]>(() => {
    if (type === "MAIN") {
      return [];
    }
  
    return normalizePlayers(
      (baseLayouts[initialFormation] ?? []) as PlayerState[]
    );
  });
  
  // refs stored in a ref so don't re-render when refs change
  const initialRefs = (baseLayouts[initialFormation] ?? []).map(() => createRef<HTMLDivElement>());
  const refsRef = useRef<React.RefObject<HTMLDivElement | null>[]>(initialRefs);

  const [moved, setMoved] = useState<boolean>(false);
  const [currentLoaded, setCurrentLoaded] = useState<PlayerState[]>(() => {
    if (type === "MAIN") {
      return [];
    }
  
    return normalizePlayers(
      (baseLayouts[initialFormation] ?? []) as PlayerState[]
    );
  });

  const [currentLoadedSlots, setCurrentLoadedSlots] = useState<FormationSlot[]>(() => {
    if (type !== "MAIN") {
      return [];
    }
  
    return ((baseLayouts[initialFormation] ?? []) as FormationSlot[]).map((slot) => ({
      ...slot,
      playerId: null,
    }));
  });

  const [savedFormations, setSavedFormations] = useState<SavedFormation[]>([]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
  
    async function loadFormations() {
      try {
        const res = await fetch("/api/formations");
        if (!res.ok) return;
  
        const data: SavedFormation[] = await res.json();
        const filtered = data.filter(f => f.type === type);
        setSavedFormations(filtered);
  
      } catch (err) {
        console.error("Failed to load formations", err);
        setSavedFormations([]);
      }
    }
  
    loadFormations();
  }, [type, authStatus]);    

  // set formation (predefined) and update positions + refs
  function setFormation(newFormation: string) {
    setFormationState(newFormation);
    const base = baseLayouts[newFormation] ?? [];
  
    if (type === "MAIN") {
      const newSlots = (base as FormationSlot[]).map((slot) => ({
        ...slot,
        playerId: null,
      }));
    
      setFormationSlots(newSlots);
      setCurrentLoadedSlots(newSlots);
    
      setPlayers([]);
      setCurrentLoaded([]);
      refsRef.current = base.map(() => createRef<HTMLDivElement>());
      setMoved(false);
      return;
    }
  
    const normalized = normalizePlayers(base as PlayerState[]);
    setPlayers(normalized);
    setCurrentLoaded(normalized);
    refsRef.current = normalized.map(() => createRef<HTMLDivElement>());
    setMoved(false);
  }

  // load a saved formation object
  function loadSavedFormation(f: SavedFormation) {
    setFormationState(f.baseFormation);
    const normalized = normalizePlayers(f.players);
    setPlayers(normalized);
    setCurrentLoaded(normalized);
    refsRef.current = normalized.map(() => createRef<HTMLDivElement>());
    setMoved(false);
  }  

  // save current positions as a named formation
  async function saveFormation(name: string) {
    if (!name.trim()) return;
  
    const snapshot = createSnapshot(players);
  
    try {
      const res = await fetch("/api/formations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          baseFormation: formation,
          type,
          players: snapshot,
        }),
      });
      
      if (!res.ok) {
        console.error("Save failed");
        return;
      }
      
      const newFormation: SavedFormation = await res.json();      
  
      setSavedFormations(prev => [
        {
          id: newFormation.id,
          name: newFormation.name,
          baseFormation: newFormation.baseFormation,
          type: newFormation.type,
          players: newFormation.players,
        },
        ...prev,
      ]);

      const normalizedFromAPI = normalizePlayers(newFormation.players);
      setPlayers(normalizedFromAPI);
      setCurrentLoaded(normalizedFromAPI);
      setMoved(false);
  
    } catch (err) {
      console.error("Failed to save formation", err);
    }
  }  

  // delete saved formation by index
  async function deleteSavedFormation(index: number) {
    const formationToDelete = savedFormations[index];
    if (!formationToDelete) return;
  
    try {
      const res = await fetch("/api/formations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: formationToDelete.id }),
      });
      
      if (!res.ok) {
        console.error("Delete failed");
        return;
      }      
  
      const updated = savedFormations.filter((_, i) => i !== index);
      setSavedFormations(updated);
  
    } catch (err) {
      console.error("Failed to delete formation", err);
    }
  }

  function resetFormationSlots() {
    const base = baseLayouts[formation] ?? [];
  
    if (type !== "MAIN") return;
  
    setFormationSlots(
      (base as FormationSlot[]).map((slot) => ({
        ...slot,
        playerId: null,
      }))
    );
  
    setMoved(false);
  }

  function resetPositions() {
    setPlayers(resetToLoaded(currentLoaded));
    setMoved(false);
  }

  return {
    formation,
    setFormation,
    formationSlots,
    setFormationSlots,
    players,
    setPlayers,
    refs: refsRef.current,
    moved,
    setMoved,
    currentLoaded,
    setCurrentLoaded,
    currentLoadedSlots,
    setCurrentLoadedSlots,
    savedFormations,
    loadSavedFormation,
    saveFormation,
    deleteSavedFormation,
    resetFormationSlots,
    resetPositions,
  } as const;
}