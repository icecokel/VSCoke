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
        // e.code 사용: 키보드 레이아웃과 무관하게 물리적 키 위치로 판단
        // e.key 사용: 한글 자모 입력 지원
        const key = e.key;
        const code = e.code;

        // 전진 (W, ↑, ㅈ)
        if (code === "KeyW" || key === "ArrowUp" || key === "ㅈ") {
          return { ...prev, forward: true };
        }
        // 후진 (S, ↓, ㄴ)
        if (code === "KeyS" || key === "ArrowDown" || key === "ㄴ") {
          return { ...prev, backward: true };
        }
        // 좌회전 (A, ←, ㅁ)
        if (code === "KeyA" || key === "ArrowLeft" || key === "ㅁ") {
          return { ...prev, turnLeft: true };
        }
        // 우회전 (D, →, ㅇ)
        if (code === "KeyD" || key === "ArrowRight" || key === "ㅇ") {
          return { ...prev, turnRight: true };
        }
        // 발사 (Space, Ctrl)
        if (code === "Space" || key === "Control") {
          return { ...prev, fire: true };
        }
        // 사용 (E, Enter, ㄷ)
        if (code === "KeyE" || key === "Enter" || key === "ㄷ") {
          return { ...prev, use: true };
        }

        return prev;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setInput(prev => {
        const key = e.key;
        const code = e.code;

        // 전진 (W, ↑, ㅈ)
        if (code === "KeyW" || key === "ArrowUp" || key === "ㅈ") {
          return { ...prev, forward: false };
        }
        // 후진 (S, ↓, ㄴ)
        if (code === "KeyS" || key === "ArrowDown" || key === "ㄴ") {
          return { ...prev, backward: false };
        }
        // 좌회전 (A, ←, ㅁ)
        if (code === "KeyA" || key === "ArrowLeft" || key === "ㅁ") {
          return { ...prev, turnLeft: false };
        }
        // 우회전 (D, →, ㅇ)
        if (code === "KeyD" || key === "ArrowRight" || key === "ㅇ") {
          return { ...prev, turnRight: false };
        }
        // 발사 (Space, Ctrl)
        if (code === "Space" || key === "Control") {
          return { ...prev, fire: false };
        }
        // 사용 (E, Enter, ㄷ)
        if (code === "KeyE" || key === "Enter" || key === "ㄷ") {
          return { ...prev, use: false };
        }

        return prev;
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
