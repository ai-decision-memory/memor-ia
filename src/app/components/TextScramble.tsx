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
  animateOnMount = false,
}: {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  className?: string;
  trigger?: boolean;
  animateOnMount?: boolean;
}) {
  const [displayText, setDisplayText] = useState(children);
  const prevText = useRef(animateOnMount ? "" : children);
  const shouldAnimateOnMount = useRef(animateOnMount);

  useEffect(() => {
    const shouldAnimate =
      trigger && (shouldAnimateOnMount.current || children !== prevText.current);

    prevText.current = children;
    shouldAnimateOnMount.current = false;

    if (!shouldAnimate) {
      prevText.current = children;
      setDisplayText(children);
      return;
    }

    const text = children;
    const steps = Math.max(1, Math.ceil(duration / speed));
    let step = 0;

    const updateDisplayText = () => {
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
    };

    updateDisplayText();

    const interval = window.setInterval(() => {
      step += 1;

      if (step > steps) {
        clearInterval(interval);
        setDisplayText(text);
        return;
      }

      updateDisplayText();
    }, speed * 1000);

    return () => clearInterval(interval);
  }, [animateOnMount, characterSet, children, duration, speed, trigger]);

  return <span className={className}>{displayText}</span>;
}
