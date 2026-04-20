import { useEffect, useState } from "react";
import { resolveViewport } from "./breakpoints";

function getInitialViewport() {
  if (typeof window === "undefined") return resolveViewport(1280);
  return resolveViewport(window.innerWidth);
}

export default function useViewport() {
  const [viewport, setViewport] = useState(getInitialViewport);

  useEffect(() => {
    function onResize() {
      setViewport(resolveViewport(window.innerWidth));
    }

    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return viewport;
}
