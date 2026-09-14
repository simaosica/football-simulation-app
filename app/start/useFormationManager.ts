// app/start/hooks/useFormationManager.ts
import React, { createRef, useEffect, useRef, useState } from 'react';
import { PlayerState, SavedFormation } from '@/engine/models/types';
import { normalizePlayers, createSnapshot, resetToLoaded } from "@/engine/formations/formationManager";

export default function useFormationManager(baseLayouts: Record<string, PlayerState[]>, type: "MAIN" | "OPPONENT", initialFormation: string = Object.keys(baseLayouts)[0] as string, authStatus: string) {
  const [formation, setFormationState] = useState<string>(initialFormation);
  const [players, setPlayers] = useState<PlayerState[]>(() => normalizePlayers(baseLayouts[initialFormation] ?? []));
  
  // refs stored in a ref so don't re-render when refs change
  const initialRefs = (baseLayouts[initialFormation] ?? []).map(() => createRef<HTMLDivElement>());
  const refsRef = useRef<React.RefObject<HTMLDivElement | null>[]>(initialRefs);

  const [moved, setMoved] = useState<boolean>(false);
  const [currentLoaded, setCurrentLoaded] = useState<PlayerState[]>(() => normalizePlayers(baseLayouts[initialFormation] ?? []));

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
    const normalized = normalizePlayers(base);
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

  function resetPositions() {
    setPlayers(resetToLoaded(currentLoaded));
    setMoved(false);
  }

  return {
    formation,
    setFormation,
    players,
    setPlayers,
    refs: refsRef.current,
    moved,
    setMoved,
    currentLoaded,
    setCurrentLoaded,
    savedFormations,
    loadSavedFormation,
    saveFormation,
    deleteSavedFormation,
    resetPositions,
  } as const;
}