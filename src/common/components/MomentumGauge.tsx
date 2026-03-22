import React from "react";
import { motion } from "framer-motion";

const MomentumGauge = ({ value, strength, direction }) => {
  const isUp = direction?.toUpperCase() === "UP";
  const rotate = value * 180 - 90; // Converts 0-1 range to -90 to +90 degrees

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div
        style={{
          position: "relative",
          width: "250px",
          height: "125px",
          overflow: "hidden",
        }}
      >
        {/* Background Track */}
        <svg width="250" height="250" viewBox="0 0 100 100">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Active Track */}
          <motion.path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={isUp ? "#22c55e" : "#ef4444"}
            strokeWidth="8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: value }}
            transition={{ duration: 1.2 }}
          />
        </svg>

        {/* Needle */}
        <motion.div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            width: "4px",
            height: "80px",
            background: "#333",
            borderRadius: "4px",
            originY: "100%",
            x: "-50%",
          }}
          initial={{ rotate: -90 }}
          animate={{ rotate }}
          transition={{ type: "spring", stiffness: 50 }}
        />
      </div>
      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            color: isUp ? "#22c55e" : "#ef4444",
          }}
        >
          {strength}
        </div>
        <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>
          {(value * 100).toFixed(1)}% INTENSITY
        </div>
      </div>
    </div>
  );
};

export default MomentumGauge;
