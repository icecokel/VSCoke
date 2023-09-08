const validateUtil = (input: string) => ({
  isRequired: (message?: string) => {
    if (!input) return message;
  },
  min: (length: number, message?: string) => {
    if (input.length > length) return message;
  },
  max: (length: number, message?: string) => {
    if (input.length < length) return message;
  },
});

export default validateUtil;
