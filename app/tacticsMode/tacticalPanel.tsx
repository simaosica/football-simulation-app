'use client';
import React from "react";
import styles from "./tacticalPanel.module.css";
import { useLanguage } from "@/app/i18n/languageContext";
import { TacticalProfile } from "@/engine/models/types";

type Props = {
  tacticalProfile: TacticalProfile;
  onChange: (profile: TacticalProfile) => void;
};

const TacticalIdeasPanel: React.FC<Props> = ({ tacticalProfile, onChange }) => {
  const { t } = useLanguage();
  const {buildUpSide, tempo, risk, maxPasses} = tacticalProfile;

  // Helper to get translated label for each option
  const optionLabel = (value: string) => {
    switch (value) {
      case "SLOW": return t.slow;
      case "NORMAL": return t.normal;
      case "FAST": return t.fast;
  
      case "LOW": return t.low;
      case "MEDIUM": return t.medium;
      case "HIGH": return t.high;
  
      default: return value;
    }
  };  

  const renderOptions = (options: string[], selected: string, key: keyof TacticalProfile) =>
    options.map(opt => (
      <button key={opt} className={`${styles.optionButton} ${selected === opt ? styles.active : ""}`}
        onClick={() => onChange({ ...tacticalProfile, [key]: opt })}
      >{optionLabel(opt)}</button>
    ));

  return (
    <div className={styles.container}>
      <h1 className="menu-title">{t.tacticalIdeas}</h1>
      <div className={styles.settingsGrid}>

        <div className={styles.section}>
          <label>{t.buildUpSide}</label>

          <div className={styles.sliderWrapper}>
            <input className={styles.slider} type="range" min={-1} max={1} step={0.05} value={buildUpSide}
              onChange={(e) => onChange({...tacticalProfile, buildUpSide: Number(e.target.value)})}
            />
            <div className={styles.zeroMark}/></div>
          <div className={styles.sliderLabels}>
            <span>{t.left}</span>
            <span>{t.neutral}</span>
            <span>{t.right}</span>
          </div>
        </div>

        <div className={styles.section}>
          <label>{t.tempo}</label>
          <div className={styles.optionRow}>
            {renderOptions(["SLOW", "NORMAL", "FAST"], tempo, "tempo")}
          </div>
        </div>

        <div className={styles.section}>
          <label>{t.buildUpRisk}</label>
          <div className={styles.optionRow}>
            {renderOptions(["LOW", "MEDIUM", "HIGH"], risk, "risk")}
          </div>
        </div>

        <div className={styles.section}>
          <label>{t.maxPasses}: <span>{maxPasses}</span></label>
          <div className={styles.sliderWrapper}>
            <input className={styles.slider}
              type="range"
              min={5}
              max={20}
              step={1}
              value={maxPasses}
              onChange={(e) => onChange({ ...tacticalProfile, maxPasses: Number(e.target.value)})}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TacticalIdeasPanel;