import { useEffect, useState } from "react";
import { BREAKPOINTS } from "./breakpoints";

export default function useIsMobile(breakpoint = BREAKPOINTS.mobileMax) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= breakpoint);
    }

    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}
