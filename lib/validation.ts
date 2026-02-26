/**
 * FlashRide – Input validation helpers
 * Lightweight validation without external dependencies.
 */

export type ValidationResult = { valid: true } | { valid: false; message: string };

export const validate = {
  /**
   * Non-empty string, minimum length.
   */
  required(value: string, fieldName: string, minLength = 2): ValidationResult {
    const v = value.trim();
    if (!v) return { valid: false, message: `${fieldName} is required` };
    if (v.length < minLength)
      return { valid: false, message: `${fieldName} must be at least ${minLength} characters` };
    return { valid: true };
  },

  /**
   * Full name: letters, spaces, hyphens, apostrophes only.
   */
  fullName(value: string): ValidationResult {
    const req = validate.required(value, 'Full name', 2);
    if (!req.valid) return req;
    if (!/^[a-zA-ZÀ-ÿ\s'\-]+$/.test(value.trim()))
      return { valid: false, message: 'Full name contains invalid characters' };
    if (value.trim().length > 80)
      return { valid: false, message: 'Full name is too long' };
    return { valid: true };
  },

  /**
   * Mauritius phone: +230 or 0 prefix, 7–8 digits.
   */
  phone(value: string): ValidationResult {
    if (!value.trim()) return { valid: true }; // phone is optional
    const digits = value.replace(/[\s\-\(\)]/g, '');
    if (!/^(\+?230)?[0-9]{7,8}$/.test(digits))
      return { valid: false, message: 'Enter a valid Mauritius phone number (e.g. +230 5912 3456)' };
    return { valid: true };
  },

  /**
   * Email format check.
   */
  email(value: string): ValidationResult {
    const req = validate.required(value, 'Email');
    if (!req.valid) return req;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
      return { valid: false, message: 'Enter a valid email address' };
    return { valid: true };
  },

  /**
   * Password: minimum 8 characters.
   */
  password(value: string): ValidationResult {
    if (!value) return { valid: false, message: 'Password is required' };
    if (value.length < 8)
      return { valid: false, message: 'Password must be at least 8 characters' };
    return { valid: true };
  },

  /**
   * Positive integer in a range.
   */
  intRange(value: string, fieldName: string, min: number, max: number): ValidationResult {
    const n = parseInt(value, 10);
    if (isNaN(n)) return { valid: false, message: `${fieldName} must be a number` };
    if (n < min || n > max)
      return { valid: false, message: `${fieldName} must be between ${min} and ${max}` };
    return { valid: true };
  },

  /**
   * Optional positive decimal (price).
   */
  optionalPrice(value: string): ValidationResult {
    if (!value.trim()) return { valid: true };
    const n = parseFloat(value);
    if (isNaN(n) || n < 0)
      return { valid: false, message: 'Price must be a positive number' };
    if (n > 9999)
      return { valid: false, message: 'Price seems too high (max MUR 9999)' };
    return { valid: true };
  },

  /**
   * Future date: departure must be at least `minutesAhead` from now.
   */
  futureDate(date: Date, minutesAhead = 15): ValidationResult {
    const minTime = new Date(Date.now() + minutesAhead * 60 * 1000);
    if (date < minTime)
      return { valid: false, message: `Departure must be at least ${minutesAhead} minutes from now` };
    return { valid: true };
  },

  /**
   * Address text: not empty, not too short.
   */
  address(value: string, fieldName = 'Location'): ValidationResult {
    const req = validate.required(value, fieldName, 3);
    if (!req.valid) return req;
    if (value.trim().length > 200)
      return { valid: false, message: `${fieldName} is too long` };
    return { valid: true };
  },

  /**
   * Vehicle make/model: letters, digits, spaces, hyphens.
   */
  vehicleText(value: string, fieldName: string): ValidationResult {
    if (!value.trim()) return { valid: true }; // optional
    if (value.trim().length < 2)
      return { valid: false, message: `${fieldName} is too short` };
    if (value.trim().length > 50)
      return { valid: false, message: `${fieldName} is too long` };
    return { valid: true };
  },

  /**
   * Number plate: at least 2 chars, max 12.
   */
  numberPlate(value: string): ValidationResult {
    if (!value.trim()) return { valid: true }; // optional
    const clean = value.trim().toUpperCase();
    if (clean.length < 2 || clean.length > 12)
      return { valid: false, message: 'Number plate must be 2–12 characters' };
    if (!/^[A-Z0-9\s\-]+$/.test(clean))
      return { valid: false, message: 'Number plate contains invalid characters' };
    return { valid: true };
  },
};

/**
 * Run multiple validations and return the first failure, or null if all pass.
 */
export function firstError(...results: ValidationResult[]): string | null {
  for (const r of results) {
    if (!r.valid) return r.message;
  }
  return null;
}
