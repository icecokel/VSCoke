import Script from "next/script";

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

type GoogleAnalyticsProps = {
  measurementId?: string;
};

const isGoogleAnalyticsMeasurementId = (
  measurementId: string | undefined,
): measurementId is string => {
  return typeof measurementId === "string" && GA_MEASUREMENT_ID_PATTERN.test(measurementId);
};

export const GoogleAnalytics = ({ measurementId }: GoogleAnalyticsProps) => {
  if (!isGoogleAnalyticsMeasurementId(measurementId)) {
    return null;
  }

  const encodedMeasurementId = encodeURIComponent(measurementId);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodedMeasurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${encodedMeasurementId}');
        `}
      </Script>
    </>
  );
};
