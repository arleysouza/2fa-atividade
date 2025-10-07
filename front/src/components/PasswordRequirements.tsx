import type { CSSProperties } from "react";
import { passwordRequirements } from "../utils/passwordRules";

const listStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "0.75rem 0 0",
  fontSize: "0.9rem",
};

const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  marginBottom: "0.35rem",
};

const metStyle: CSSProperties = {
  color: "#1b873f",
};

const unmetStyle: CSSProperties = {
  color: "#c53030",
};

type PasswordRequirementsProps = {
  password: string;
  className?: string;
  style?: CSSProperties;
};

const PasswordRequirements = ({
  password,
  className,
  style,
}: PasswordRequirementsProps) => {
  return (
    <ul
      className={className}
      style={{ ...listStyle, ...style }}
      aria-live="polite"
    >
      {passwordRequirements.map((requirement) => {
        const met = requirement.test(password);
        return (
          <li
            key={requirement.id}
            style={{ ...itemStyle, ...(met ? metStyle : unmetStyle) }}
          >
            <span aria-hidden>{met ? "\u2714" : "\u2718"}</span>
            <span>{requirement.label}</span>
          </li>
        );
      })}
    </ul>
  );
};

export default PasswordRequirements;
