import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", ".reference-cuddly-lamp/**"]
  },
  ...nextVitals
];

export default eslintConfig;
