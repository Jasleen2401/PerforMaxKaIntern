import React from "react";

interface DailoqaLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "dark" | "light";
  showTagline?: boolean;
  taglineText?: string;
  className?: string;
}

export const DailoqaLogo: React.FC<DailoqaLogoProps> = ({
  size = "md",
  variant = "dark",
  showTagline = false,
  taglineText = "Combined Intelligence",
  className = "",
}) => {
  const isLight = variant === "light";
  const textColor = isLight ? "#FFFFFF" : "#0B0F17";
  const aiColor = "#4338CA"; // Dailoqa iconic electric indigo

  const sizeStyles = {
    sm: { fontSize: "19px", gap: "6px", dotSize: "5px", subSize: "10px" },
    md: { fontSize: "24px", gap: "8px", dotSize: "6px", subSize: "11px" },
    lg: { fontSize: "32px", gap: "10px", dotSize: "8px", subSize: "12px" },
    xl: { fontSize: "42px", gap: "12px", dotSize: "10px", subSize: "13px" },
  }[size];

  return (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <div className="flex items-center" style={{ gap: sizeStyles.gap }}>
        {/* Project Name PERFORMAX with electric indigo AX accent */}
        <div
          className="font-extrabold tracking-[-0.03em] flex items-baseline leading-none"
          style={{
            fontSize: sizeStyles.fontSize,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <span style={{ color: textColor }}>PERFORM</span>
          <span
            className="relative font-black tracking-[-0.02em] px-[0.5px]"
            style={{
              color: isLight ? "#818CF8" : aiColor,
              textShadow: isLight
                ? "0 0 16px rgba(129, 140, 248, 0.45)"
                : "0 0 14px rgba(67, 56, 202, 0.25)",
            }}
          >
            AX
          </span>
        </div>

        {/* Small accent node badge */}
        <span
          className="rounded-full flex items-center justify-center"
          style={{
            width: sizeStyles.dotSize,
            height: sizeStyles.dotSize,
            background: isLight ? "#818CF8" : aiColor,
            boxShadow: `0 0 8px ${isLight ? "#818CF8" : aiColor}`,
          }}
        />
      </div>

      {showTagline && (
        <span
          className="font-medium tracking-wide uppercase mt-1"
          style={{
            fontSize: sizeStyles.subSize,
            color: isLight ? "#94A3B8" : "#64748B",
            letterSpacing: "0.08em",
          }}
        >
          {taglineText}
        </span>
      )}
    </div>
  );
};

export default DailoqaLogo;
