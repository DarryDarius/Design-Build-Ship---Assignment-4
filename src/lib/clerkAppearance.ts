// Clerk's sign-in, sign-up and account screens in the Calm style: oat paper, clay accent, 1px lines, no shadows.
export const calmAppearance = {
  variables: {
    colorPrimary: "#9a4426",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "#fbf7f1",
    colorForeground: "#2a231d",
    colorMutedForeground: "#6b5f54",
    colorNeutral: "#2a231d",
    colorInput: "#fbf7f1",
    colorInputForeground: "#2a231d",
    colorBorder: "#dcd0bf",
    colorDanger: "#9b2c2c",
    colorRing: "#9a4426",
    fontFamily: "var(--font-dm-sans)",
    fontFamilyButtons: "var(--font-dm-sans)",
    borderRadius: "0.375rem",
  },
  elements: {
    cardBox: { boxShadow: "none", border: "1px solid #dcd0bf" },
    formButtonPrimary: { boxShadow: "none", backgroundImage: "none" },
    formFieldInput: { boxShadow: "none", border: "1px solid #dcd0bf" },
    socialButtonsBlockButton: { boxShadow: "none", border: "1px solid #dcd0bf" },
    headerTitle: { fontFamily: "var(--font-fraunces)", fontWeight: 400, fontSize: "1.5rem" },
  },
};
