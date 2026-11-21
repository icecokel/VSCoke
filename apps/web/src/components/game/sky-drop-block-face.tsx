import styles from "./sky-drop.module.css";

// GameConstants.BLOCK_PALETTE와 같은 순서로 성격을 지정한다.
const personalities = [
  "playful",
  "sleepy",
  "cheerful",
  "shy",
  "curious",
  "cool",
  "calm",
  "grumpy",
] as const;

interface SkyDropBlockFaceProps {
  color: number;
}

export const SkyDropBlockFace = ({ color }: SkyDropBlockFaceProps) => (
  <span className={styles.face} data-personality={personalities[color]}>
    <span className={styles.mouth} />
  </span>
);
