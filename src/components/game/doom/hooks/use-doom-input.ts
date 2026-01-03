"use client";

import { useState, useEffect, useCallback } from "react";
import { InputState } from "../types/doom-types";

const initialInput: InputState = {
  forward: false,
  backward: false,
  turnLeft: false,
  turnRight: false,
  fire: false,
  use: false,
};

/**
 * 키보드 + 터치 입력 통합 훅
 * @returns 현재 입력 상태 및 터치 입력 설정 함수
 */
export const useDoomInput = () => {
  const [input, setInput] = useState<InputState>(initialInput);

  // 키보드 입력 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 기본 동작 방지 (스크롤 등)
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      setInput(prev => {
        switch (e.key) {
          case "ArrowUp":
          case "w":
          case "W":
            return { ...prev, forward: true };
          case "ArrowDown":
          case "s":
          case "S":
            return { ...prev, backward: true };
          case "ArrowLeft":
          case "a":
          case "A":
            return { ...prev, turnLeft: true };
          case "ArrowRight":
          case "d":
          case "D":
            return { ...prev, turnRight: true };
          case " ":
          case "Control":
            return { ...prev, fire: true };
          case "e":
          case "E":
          case "Enter":
            return { ...prev, use: true };
          default:
            return prev;
        }
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setInput(prev => {
        switch (e.key) {
          case "ArrowUp":
          case "w":
          case "W":
            return { ...prev, forward: false };
          case "ArrowDown":
          case "s":
          case "S":
            return { ...prev, backward: false };
          case "ArrowLeft":
          case "a":
          case "A":
            return { ...prev, turnLeft: false };
          case "ArrowRight":
          case "d":
          case "D":
            return { ...prev, turnRight: false };
          case " ":
          case "Control":
            return { ...prev, fire: false };
          case "e":
          case "E":
          case "Enter":
            return { ...prev, use: false };
          default:
            return prev;
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 터치 버튼 핸들러 (모바일용)
  const setTouchInput = useCallback((key: keyof InputState, value: boolean) => {
    setInput(prev => ({ ...prev, [key]: value }));
  }, []);

  // 입력 초기화
  const resetInput = useCallback(() => {
    setInput(initialInput);
  }, []);

  return { input, setTouchInput, resetInput };
};
