import { forwardRef, useState, type CSSProperties, type InputHTMLAttributes } from "react";

export type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  toggleLabel?: {
    show: string;
    hide: string;
  };
  containerStyle?: CSSProperties;
};

const defaultLabels = {
  show: "Mostrar",
  hide: "Ocultar",
};

const baseContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const buttonStyle: CSSProperties = {
  padding: "0.4rem 0.8rem",
  fontSize: "0.85rem",
  cursor: "pointer",
};

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ toggleLabel = defaultLabels, containerStyle, style, ...inputProps }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div style={{ ...baseContainerStyle, ...containerStyle }}>
        <input
          {...inputProps}
          ref={ref}
          type={visible ? "text" : "password"}
          style={{ flex: 1, ...(style as CSSProperties) }}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? toggleLabel.hide : toggleLabel.show}
          style={buttonStyle}
        >
          {visible ? toggleLabel.hide : toggleLabel.show}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
