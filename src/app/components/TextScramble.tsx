"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function TextScramble({
  children,
  duration = 0.6,
  speed = 0.04,
  characterSet = DEFAULT_CHARS,
  className,
  trigger = true,
}: {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  className?: string;
  trigger?: boolean;
}) {
  const [displayText, setDisplayText] = useState(children);
  const prevText = useRef(children);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (!trigger || isAnimating.current) {
      prevText.current = children;
      setDisplayText(children);
      return;
    }

    if (children === prevText.current) {
      return;
    }

    prevText.current = children;
    isAnimating.current = true;

    const text = children;
    const steps = duration / speed;
    let step = 0;

    const interval = setInterval(() => {
      let scrambled = "";
      const progress = step / steps;

      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") {
          scrambled += " ";
          continue;
        }

        if (progress * text.length > i) {
          scrambled += text[i];
        } else {
          scrambled +=
            characterSet[Math.floor(Math.random() * characterSet.length)];
        }
      }

      setDisplayText(scrambled);
      step++;

      if (step > steps) {
        clearInterval(interval);
        setDisplayText(text);
        isAnimating.current = false;
      }
    }, speed * 1000);

    return () => clearInterval(interval);
  }, [children, trigger, duration, speed, characterSet]);

  return <span className={className}>{displayText}</span>;
}
