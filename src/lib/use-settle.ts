"use client";
import { useEffect, useRef, useState } from "react";

/**
 * 값이 '차오르다가 → 목표 근처에서 좌우로 흔들리다가 → 목표에 멈추는' 애니메이션 값
 * 예) 목표 40: -100에서 출발 → 34까지 차오름 → 34~46 사이를 오가며 점점 줄어듦 → 40
 * 움직임 줄이기 설정을 켠 사용자에게는 바로 목표 값을 보여 줍니다.
 */
export function useSettle(target: number, from = -100, { fill = 900, wobble = 1400 } = {}) {
  const [v, setV] = useState(from);
  const cur = useRef(from);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = cur.current;
    const dist = target - start;
    if (reduce || Math.abs(dist) < 0.5) {
      cur.current = target;
      setV(target);
      return;
    }
    const dir = Math.sign(dist);
    // 흔들림 폭: 이동 거리의 12% (4 ~ 8 사이)
    const amp = Math.min(8, Math.max(4, Math.abs(dist) * 0.12));
    const near = target - dir * amp;
    const t0 = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = now - t0;
      let x: number;
      if (t < fill) {
        const p = t / fill;
        x = start + (near - start) * (1 - Math.pow(1 - p, 3)); // 처음엔 빠르게, 끝에서 천천히
      } else if (t < fill + wobble) {
        const p = (t - fill) / wobble;
        x = target - dir * amp * Math.exp(-3.2 * p) * Math.cos(Math.PI * 4.5 * p); // 줄어드는 진동
      } else {
        x = target;
      }
      cur.current = x;
      setV(x);
      if (x !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, fill, wobble]);

  return v;
}
