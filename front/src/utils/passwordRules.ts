export type PasswordRequirement = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const passwordRequirements: PasswordRequirement[] = [
  {
    id: "length",
    label: "Pelo menos 8 caracteres",
    test: (value) => value.length >= 8,
  },
  {
    id: "uppercase",
    label: "Ao menos uma letra maiúscula",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: "lowercase",
    label: "Ao menos uma letra minúscula",
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: "digit",
    label: "Ao menos um dígito",
    test: (value) => /\d/.test(value),
  },
  {
    id: "special",
    label: "Ao menos um caractere especial",
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

export const isPasswordCompliant = (value: string): boolean =>
  passwordRequirements.every((rule) => rule.test(value));
