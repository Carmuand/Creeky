import type { PomodoroBlock } from "@/types/creeky";

export function calcPomodoroBlocks(durationMin: number): PomodoroBlock[] {
  const blocks: PomodoroBlock[] = [];
  let remaining = durationMin;
  let focusCount = 0;
  while (remaining > 0) {
    if (remaining >= 25) {
      blocks.push({ type: "focus", duration: 25 });
      remaining -= 25;
      focusCount++;
      if (focusCount % 4 === 0) {
        if (remaining >= 15) { blocks.push({ type: "longBreak", duration: 15 }); remaining -= 15; } else break;
      } else {
        if (remaining >= 5) { blocks.push({ type: "shortBreak", duration: 5 }); remaining -= 5; } else break;
      }
    } else {
      blocks.push({ type: "focus", duration: remaining });
      remaining = 0;
    }
  }
  return blocks;
}
