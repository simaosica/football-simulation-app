// app/start/hooks/useFormationManager.ts
import React, { createRef, useEffect, useRef, useState } from 'react';
import { PlayerState, FormationSlot, SavedFormation } from '@/engine/models/types';
import { normalizePlayers, createSnapshot, resetToLoaded } from "@/engine/formations/formationManager";

function createEmptyFormationSlots(layout: FormationSlot[]): FormationSlot[] {
  return layout.map((slot) => ({...slot, playerId: null}));
}

export default function useFormationManager(baseLayouts: Record<string, PlayerState[] | FormationSlot[]>, type: "MAIN" | "OPPONENT", initialFormation: string = Object.keys(baseLayouts)[0] as string, authStatus: string) {
  const [formation, setFormationState] = useState<string>(initialFormation);
  const [selectedSavedFormationId, setSelectedSavedFormationId] = useState<string | null>(null);

  const [formationSlots, setFormationSlots] = useState<FormationSlot[]>(() => {
    if (type !== "MAIN") {
      return [];
    }
  
    return createEmptyFormationSlots((baseLayouts[initialFormation] ?? []) as FormationSlot[]);
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
  
    return createEmptyFormationSlots((baseLayouts[initialFormation] ?? []) as FormationSlot[]);
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
    setSelectedSavedFormationId(null);
    const base = baseLayouts[newFormation] ?? [];
  
    if (type === "MAIN") {
      const newSlots = createEmptyFormationSlots(base as FormationSlot[]);
    
      setFormationSlots(newSlots);
      setCurrentLoadedSlots(newSlots);
    
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
    setSelectedSavedFormationId(f.id);
  
    if (type === "MAIN") {
      const slots = f.players as FormationSlot[];
  
      setFormationSlots(slots);
      setCurrentLoadedSlots(slots);
      refsRef.current = slots.map(() => createRef<HTMLDivElement>());
      setMoved(false);
      return;
    }
  
    const normalized = normalizePlayers(f.players as PlayerState[]);
  
    setPlayers(normalized);
    setCurrentLoaded(normalized);
    refsRef.current = normalized.map(() => createRef<HTMLDivElement>());
    setMoved(false);
  } 

  // save current positions as a named formation
  async function saveFormation(name: string) {
    if (!name.trim()) return;
  
    const snapshot = type === "MAIN"
      ? formationSlots
      : createSnapshot(players);
  
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
  
      if (type === "MAIN") {
        setSelectedSavedFormationId(newFormation.id);
        setCurrentLoadedSlots(
          formationSlots.map((slot) => ({
            ...slot,
          }))
        );
      
        setMoved(false);
      } else {
        const normalizedFromAPI = normalizePlayers(
          newFormation.players as PlayerState[]
        );
  
        setPlayers(normalizedFromAPI);
        setCurrentLoaded(normalizedFromAPI);
        setMoved(false);
      }
  
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
    if (type === "MAIN") {
      setFormationSlots(
        currentLoadedSlots.map((slot) => ({
          ...slot,
        }))
      );
    } else {
      setPlayers(resetToLoaded(currentLoaded));
    }
  
    setMoved(false);
  }

  return {
    formation,
    setFormation,
    selectedSavedFormationId,
    setSelectedSavedFormationId,
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
    resetPositions,
  } as const;
}