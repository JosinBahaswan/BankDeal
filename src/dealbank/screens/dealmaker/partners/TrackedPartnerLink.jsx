import { useMemo } from "react";
import {
  buildPartnerTrackingPixelUrl,
  buildTrackedPartnerUrl,
  getPartnerReferralId,
  trackPartnerEvent,
} from "./partnerTracking";

export default function TrackedPartnerLink({
  user,
  partnerId,
  partnerType = "software",
  placement = "",
  sourceTab = "",
  campaign = "",
  targetUrl,
  style,
  className,
  children,
  onClick,
  rel = "noopener noreferrer",
  target = "_blank",
  ...rest
}) {
  const referralId = useMemo(() => getPartnerReferralId(user), [user]);

  const trackedUrl = useMemo(() => {
    return buildTrackedPartnerUrl(targetUrl, {
      referralId,
      partnerId,
      partnerType,
    });
  }, [targetUrl, referralId, partnerId, partnerType]);

  const pixelUrl = useMemo(() => {
    return buildPartnerTrackingPixelUrl({
      partnerId,
      partnerType,
      referralId,
      placement,
      sourceTab,
      campaign,
      targetUrl: trackedUrl,
    });
  }, [partnerId, partnerType, referralId, placement, sourceTab, campaign, trackedUrl]);

  const handleClick = (event) => {
    if (typeof onClick === "function") {
      onClick(event);
    }

    if (event.defaultPrevented) {
      return;
    }

    trackPartnerEvent({
      action: "click",
      partnerId,
      partnerType,
      referralId,
      placement,
      sourceTab,
      campaign,
      targetUrl: trackedUrl,
    });
  };

  return (
    <>
      {pixelUrl && (
        <img
          src={pixelUrl}
          alt=""
          width={1}
          height={1}
          loading="lazy"
          aria-hidden
          style={{ display: "none" }}
        />
      )}

      <a
        href={trackedUrl || targetUrl}
        target={target}
        rel={rel}
        className={className}
        style={style}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </a>
    </>
  );
}
