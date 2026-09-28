// app/team/teamPageClient.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { SquadPlayer, PlayerState } from "@/engine/models/types";
import { PLAYER_PROFILE_CATALOG, getRoleFromPosition } from "@/engine/models/constants";
import Modal from "@/app/components/modal/modal";
import modalStyles from "@/app/components/modal/modal.module.css";
import styles from "./page.module.css";

export default function TeamPageClient() {
    const { status } = useSession();

    const [squad, setSquad] = useState<SquadPlayer[]>([]);

    useEffect(() => {
        if (status !== "authenticated") {
            return;
        }
    
        const loadPlayers = async () => {
            try {
                const response = await fetch("/api/team");
    
                if (!response.ok) {
                    throw new Error("Failed to load players");
                }
    
                const players = await response.json();
    
                setSquad(players as SquadPlayer[]);
            } catch (error) {
                console.error("Failed to load players:", error);
            }
        };
    
        loadPlayers();
    }, [status]);

    const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

    // New player form
    const [newPlayerName, setNewPlayerName] = useState("");
    const [newPlayerPhoto, setNewPlayerPhoto] = useState<string | undefined>(undefined);
    const [newPlayerPosition, setNewPlayerPosition] = useState<PlayerState["position"] | "">("");
    const [newPlayerShirtNumber, setNewPlayerShirtNumber] = useState<number | "">("");
    const [newPlayerProfile, setNewPlayerProfile] = useState<keyof typeof PLAYER_PROFILE_CATALOG>("DEFAULT");
    const [playerError, setPlayerError] = useState("");

    if (status === "loading") {
        return null;
    }

    if (status !== "authenticated") {
        return null;
    }

    const goalkeepers = squad.filter((player) => player.role === "GK");
    const defenders = squad.filter((player) => player.role === "DEF");
    const midfielders = squad.filter((player) => player.role === "MID");
    const forwards = squad.filter((player) => player.role === "FWD");

    const openEditPlayerModal = (player: SquadPlayer) => {
        setEditingPlayerId(player.id);
    
        setNewPlayerName(player.name);
        setNewPlayerPhoto(player.photo);
        setNewPlayerPosition(player.position);
        setNewPlayerShirtNumber(player.shirtNumber);
    
        const profileKey =
            Object.entries(PLAYER_PROFILE_CATALOG).find(
                ([, profile]) => profile.name === player.profile.name
            )?.[0];
    
        setNewPlayerProfile(
            (profileKey as keyof typeof PLAYER_PROFILE_CATALOG) ?? "DEFAULT"
        );
    
        setShowAddPlayerModal(true);
    };

    const resetPlayerForm = () => {
        setNewPlayerName("");
        setNewPlayerPhoto(undefined);
        setNewPlayerPosition("");
        setNewPlayerShirtNumber("");
        setNewPlayerProfile("DEFAULT");
        setPlayerError("");
    };

    const closeAddPlayerModal = () => {
        setShowAddPlayerModal(false);
        setEditingPlayerId(null);
        resetPlayerForm();
    };

    const handleAddPlayer = async () => {
        const trimmedName = newPlayerName.trim();
    
        if (
            !trimmedName ||
            newPlayerPosition === "" ||
            newPlayerShirtNumber === ""
        ) {
            return;
        }
    
        const shirtNumberAlreadyUsed = squad.some(
            (player) =>
                player.shirtNumber === newPlayerShirtNumber &&
                player.id !== editingPlayerId
        );
    
        if (shirtNumberAlreadyUsed) {
            return;
        }
    
        const profile = PLAYER_PROFILE_CATALOG[newPlayerProfile];
        const role = getRoleFromPosition(newPlayerPosition);
    
        try {
            if (editingPlayerId) {
                const response = await fetch("/api/team", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: editingPlayerId,
                        name: trimmedName,
                        photo: newPlayerPhoto ?? null,
                        shirtNumber: newPlayerShirtNumber,
                        role,
                        position: newPlayerPosition,
                        profile,
                    }),
                });
    
                if (response.status === 409) {
                    setPlayerError("SHIRT NUMBER ALREADY IN USE");
                    return;
                }
                
                if (!response.ok) {
                    throw new Error("Failed to update player");
                }
    
                const updatedPlayer = await response.json();
    
                setSquad((currentSquad) =>
                    currentSquad.map((player) =>
                        player.id === editingPlayerId
                            ? {
                                  id: updatedPlayer.id,
                                  name: updatedPlayer.name,
                                  photo: updatedPlayer.photo ?? undefined,
                                  shirtNumber: updatedPlayer.shirtNumber,
                                  role: updatedPlayer.role,
                                  position: updatedPlayer.position,
                                  profile: updatedPlayer.profile,
                              }
                            : player
                    )
                );
            } else {
                const response = await fetch("/api/team", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: trimmedName,
                        photo: newPlayerPhoto ?? null,
                        shirtNumber: newPlayerShirtNumber,
                        role,
                        position: newPlayerPosition,
                        profile,
                    }),
                });
    
                if (response.status === 409) {
                    setPlayerError("SHIRT NUMBER ALREADY IN USE");
                    return;
                }
                
                if (!response.ok) {
                    throw new Error("Failed to create player");
                }
    
                const createdPlayer = await response.json();
    
                const newPlayer: SquadPlayer = {
                    id: createdPlayer.id,
                    name: createdPlayer.name,
                    photo: createdPlayer.photo ?? undefined,
                    shirtNumber: createdPlayer.shirtNumber,
                    role: createdPlayer.role,
                    position: createdPlayer.position,
                    profile: createdPlayer.profile,
                };
    
                setSquad((currentSquad) => [
                    ...currentSquad,
                    newPlayer,
                ]);
            }
    
            closeAddPlayerModal();
        } catch (error) {
            console.error("Failed to save player:", error);
        }
    };

    const handleDeletePlayer = async (playerId: string) => {
        try {
            const response = await fetch("/api/team", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: playerId,
                }),
            });
    
            if (!response.ok) {
                throw new Error("Failed to delete player");
            }
    
            setSquad((currentSquad) =>
                currentSquad.filter((player) => player.id !== playerId)
            );
        } catch (error) {
            console.error("Failed to delete player:", error);
        }
    };

    return (
        <main className={styles.page}>
            <h1 className={styles.title}>MY SQUAD</h1>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>GOALKEEPERS</h2>

                {goalkeepers.length === 0 ? (
                    <p className={styles.empty}>
                        No goalkeepers added.
                    </p>
                ) : (
                    goalkeepers.map((player) => (
                        <div key={player.id} className={styles.playerRow}>
                            {player.photo ? (
                                <Image
                                    src={player.photo}
                                    alt=""
                                    width={50}
                                    height={50}
                                    unoptimized
                                    className={styles.playerPhoto}
                                />
                            ) : (
                                <div className={styles.playerNumber}>
                                    {player.shirtNumber}
                                </div>
                            )}

                            <div className={styles.playerInfo}>
                                <span className={styles.playerName}>
                                    {player.name}
                                </span>

                                <span className={styles.playerPosition}>
                                    {player.position}
                                </span>
                            </div>

                            <button
                                className={styles.editButton}
                                onClick={() => openEditPlayerModal(player)}
                                aria-label={`Edit ${player.name}`}
                            >
                                ⚙
                            </button>
                            <button
                                className={styles.deleteButton}
                                onClick={() => handleDeletePlayer(player.id)}
                                aria-label={`Delete ${player.name}`}
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>DEFENDERS</h2>

                {defenders.length === 0 ? (
                    <p className={styles.empty}>
                        No defenders added.
                    </p>
                ) : (
                    defenders.map((player) => (
                        <div key={player.id} className={styles.playerRow}>
                            {player.photo ? (
                                <Image
                                    src={player.photo}
                                    alt=""
                                    width={50}
                                    height={50}
                                    unoptimized
                                    className={styles.playerPhoto}
                                />
                            ) : (
                                <div className={styles.playerNumber}>
                                    {player.shirtNumber}
                                </div>
                            )}

                            <div className={styles.playerInfo}>
                                <span className={styles.playerName}>
                                    {player.name}
                                </span>

                                <span className={styles.playerPosition}>
                                    {player.position}
                                </span>
                            </div>

                            <button
                                className={styles.editButton}
                                onClick={() => openEditPlayerModal(player)}
                                aria-label={`Edit ${player.name}`}
                            >
                                ⚙
                            </button>
                            <button
                                className={styles.deleteButton}
                                onClick={() => handleDeletePlayer(player.id)}
                                aria-label={`Delete ${player.name}`}
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>MIDFIELDERS</h2>

                {midfielders.length === 0 ? (
                    <p className={styles.empty}>
                        No midfielders added.
                    </p>
                ) : (
                    midfielders.map((player) => (
                        <div key={player.id} className={styles.playerRow}>
                            {player.photo ? (
                                <Image
                                    src={player.photo}
                                    alt=""
                                    width={50}
                                    height={50}
                                    unoptimized
                                    className={styles.playerPhoto}
                                />
                            ) : (
                                <div className={styles.playerNumber}>
                                    {player.shirtNumber}
                                </div>
                            )}

                            <div className={styles.playerInfo}>
                                <span className={styles.playerName}>
                                    {player.name}
                                </span>

                                <span className={styles.playerPosition}>
                                    {player.position}
                                </span>
                            </div>

                            <button
                                className={styles.editButton}
                                onClick={() => openEditPlayerModal(player)}
                                aria-label={`Edit ${player.name}`}
                            >
                                ⚙
                            </button>
                            <button
                                className={styles.deleteButton}
                                onClick={() => handleDeletePlayer(player.id)}
                                aria-label={`Delete ${player.name}`}
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>ATTACKERS</h2>

                {forwards.length === 0 ? (
                    <p className={styles.empty}>
                        No attackers added.
                    </p>
                ) : (
                    forwards.map((player) => (
                        <div key={player.id} className={styles.playerRow}>
                            {player.photo ? (
                                <Image
                                    src={player.photo}
                                    alt=""
                                    width={50}
                                    height={50}
                                    unoptimized
                                    className={styles.playerPhoto}
                                />
                            ) : (
                                <div className={styles.playerNumber}>
                                    {player.shirtNumber}
                                </div>
                            )}

                            <div className={styles.playerInfo}>
                                <span className={styles.playerName}>
                                    {player.name}
                                </span>

                                <span className={styles.playerPosition}>
                                    {player.position}
                                </span>
                            </div>
                            <button
                                className={styles.editButton}
                                onClick={() => openEditPlayerModal(player)}
                                aria-label={`Edit ${player.name}`}
                            >
                                ⚙
                            </button>
                            <button
                                className={styles.deleteButton}
                                onClick={() => handleDeletePlayer(player.id)}
                                aria-label={`Delete ${player.name}`}
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </section>

            <button
                className={styles.addButton}
                onClick={() => setShowAddPlayerModal(true)}
            >
                + ADD PLAYER
            </button>

            <Modal open={showAddPlayerModal}>
                <div className={modalStyles.photoUpload}>
                    <label className={modalStyles.modalLabel}>
                        PLAYER PHOTO
                    </label>

                    {newPlayerPhoto ? (
                        <Image
                            src={newPlayerPhoto}
                            alt="Player"
                            width={70}
                            height={70}
                            unoptimized
                            className={modalStyles.photoPreview}
                        />
                    ) : (
                        <div className={modalStyles.photoPlaceholder}>
                            👤
                        </div>
                    )}

                    <label className={modalStyles.photoButton}>
                        {newPlayerPhoto
                            ? "CHANGE PHOTO"
                            : "CHOOSE PHOTO"}

                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                                const file = e.target.files?.[0];

                                if (!file) {
                                    return;
                                }

                                const reader = new FileReader();

                                reader.onload = () => {
                                    setNewPlayerPhoto(
                                        reader.result as string
                                    );
                                };

                                reader.readAsDataURL(file);
                            }}
                        />
                    </label>
                </div>

                <label className={modalStyles.modalLabel}>
                    PLAYER NAME
                </label>

                <input
                    className={modalStyles.modalInput}
                    type="text"
                    value={newPlayerName}
                    onChange={(e) =>
                        setNewPlayerName(e.target.value)
                    }
                    placeholder="PLAYER NAME"
                />

                <label className={modalStyles.modalLabel}>
                    POSITION
                </label>

                <select
                    className={modalStyles.modalSelect}
                    value={newPlayerPosition}
                    onChange={(e) => {
                        const newPosition =
                            e.target.value as PlayerState["position"];

                        setNewPlayerPosition(newPosition);

                        const newRole =
                            getRoleFromPosition(newPosition);

                        if (newRole === "GK") {
                            setNewPlayerProfile("DEFAULT_GK");
                        } else if (newRole === "DEF") {
                            setNewPlayerProfile("DEFAULT_CB");
                        } else if (newRole === "MID") {
                            setNewPlayerProfile("DEFAULT_MIDFIELDER");
                        } else if (
                            newPosition === "LW" ||
                            newPosition === "RW"
                        ) {
                            setNewPlayerProfile("WINGER");
                        } else if (
                            newPosition === "ST" ||
                            newPosition === "LST" ||
                            newPosition === "RST"
                        ) {
                            setNewPlayerProfile("STRIKER");
                        } else {
                            setNewPlayerProfile("DEFAULT_ATTACKER");
                        }
                    }}
                >
                    <option value=""></option>

                    <option value="GK">GOALKEEPER</option>

                    <option value="LB">LEFT BACK</option>
                    <option value="LWB">LEFT WING BACK</option>
                    <option value="LCB">LEFT CENTRE BACK</option>
                    <option value="CB">CENTRE BACK</option>
                    <option value="RCB">RIGHT CENTRE BACK</option>
                    <option value="RB">RIGHT BACK</option>
                    <option value="RWB">RIGHT WING BACK</option>

                    <option value="CDM">DEFENSIVE MIDFIELDER</option>
                    <option value="LCDM">LEFT DEFENSIVE MIDFIELDER</option>
                    <option value="RCDM">RIGHT DEFENSIVE MIDFIELDER</option>
                    <option value="CM">CENTRE MIDFIELDER</option>
                    <option value="LCM">LEFT CENTRE MIDFIELDER</option>
                    <option value="RCM">RIGHT CENTRE MIDFIELDER</option>
                    <option value="LM">LEFT MIDFIELDER</option>
                    <option value="RM">RIGHT MIDFIELDER</option>
                    <option value="CAM">ATTACKING MIDFIELDER</option>
                    <option value="LCAM">LEFT ATTACKING MIDFIELDER</option>
                    <option value="RCAM">RIGHT ATTACKING MIDFIELDER</option>

                    <option value="LW">LEFT WINGER</option>
                    <option value="RW">RIGHT WINGER</option>
                    <option value="ST">STRIKER</option>
                    <option value="LST">LEFT STRIKER</option>
                    <option value="RST">RIGHT STRIKER</option>
                </select>

                <label className={modalStyles.modalLabel}>
                    SHIRT NUMBER
                </label>

                <select
                    className={modalStyles.modalSelect}
                    value={newPlayerShirtNumber}
                    onChange={(e) =>
                        setNewPlayerShirtNumber(
                            e.target.value === "" ? "" : Number(e.target.value)
                        )
                    }
                >
                    <option value=""></option>
                
                    {Array.from({ length: 99 }, (_, i) => i + 1)
                        .filter(
                            (number) =>
                                number === newPlayerShirtNumber ||
                                !squad.some(
                                    (player) =>
                                        player.id !== editingPlayerId &&
                                        player.shirtNumber === number
                                )
                        )
                        .map((number) => (
                            <option key={number} value={number}>
                                {number}
                            </option>
                        ))}
                </select>

                <label className={modalStyles.modalLabel}>
                    PLAYER PROFILE
                </label>

                <select
                    className={modalStyles.modalSelect}
                    value={newPlayerProfile}
                    onChange={(e) =>
                        setNewPlayerProfile(
                            e.target.value as keyof typeof PLAYER_PROFILE_CATALOG
                        )
                    }
                >
                    {Object.entries(PLAYER_PROFILE_CATALOG).map(
                        ([key, profile]) => (
                            <option key={key} value={key}>
                                {profile.name}
                            </option>
                        )
                    )}
                </select>

                {playerError && (
                    <p className={modalStyles.errorText}>
                        {playerError}
                    </p>
                )}

                <div className={modalStyles.modalActions}>
                    <button
                        className={modalStyles.confirmButtonSave}
                        disabled={!newPlayerName.trim() || newPlayerPosition === "" || newPlayerShirtNumber === ""}
                        onClick={handleAddPlayer}
                    >
                        SAVE
                    </button>

                    <button
                        className={modalStyles.cancelButton}
                        onClick={closeAddPlayerModal}
                    >
                        CANCEL
                    </button>
                </div>
            </Modal>
        </main>
    );
}