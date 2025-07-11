export interface SnapshotElement {
  tag?: string;
  attributes?: Record<string, any>;
  text?: string;
  ref?: string;
}

/**
 * Pattern helper – supports:
 *   attr*=value   → substring match
 *   attr=value    → exact match
 */
export function matchesAttributePattern(attributes: Record<string, any>, pattern: string): boolean {
  // Sub-string pattern
  if (pattern.includes('*=')) {
    const [attr, condition] = pattern.split('*=');
    const value = attributes?.[attr];
    if (!value) return false;
    return value.toLowerCase().includes(condition.toLowerCase());
  }

  // Exact attr=value pattern
  if (pattern.includes('=')) {
    const [attr, expected] = pattern.split('=');
    const value = attributes?.[attr];
    if (!value) return false;
    return value.toLowerCase() === expected.toLowerCase();
  }

  // No operator → check attribute existence
  // Use Object.prototype.hasOwnProperty to avoid accessing the prototype directly (ESLint compliance)
  return Object.prototype.hasOwnProperty.call(attributes ?? {}, pattern);
}

/** Build a reasonably specific CSS selector for a DOM node snapshot. */
export function buildSelector(element: SnapshotElement): string {
  const { tag = 'div', attributes = {} } = element;
  if (attributes.id) return `#${attributes.id}`;
  if (attributes.name) return `${tag}[name="${attributes.name}"]`;
  if (attributes.class) return `${tag}.${attributes.class.split(' ')[0]}`;
  return tag;
}

/** Field purpose → heuristics mapping extracted from BaseCarrierAgent. */
const fieldPatterns: Record<string, {
  attributes?: string[];
  text?: string[];
  types?: string[];
  maxlength?: number[];
}> = {
  zipcode: {
    attributes: ['name*=zip', 'id*=zip', 'placeholder*=zip'],
    text: ['zip code', 'postal code'],
    types: ['tel', 'text'],
    maxlength: [5],
  },
  email: {
    attributes: ['type=email', 'name*=email', 'id*=email'],
    text: ['email', 'e-mail'],
    types: ['email'],
  },
  firstname: {
    attributes: ['name*=first', 'id*=first', 'placeholder*=first'],
    text: ['first name', 'given name'],
    types: ['text'],
  },
  lastname: {
    attributes: ['name*=last', 'id*=last', 'placeholder*=last'],
    text: ['last name', 'surname', 'family name'],
    types: ['text'],
  },
  dateofbirth: {
    attributes: ['name*=birth', 'name*=dob', 'id*=birth', 'placeholder*=birth'],
    text: ['date of birth', 'birthday', 'birth date'],
    types: ['text', 'date'],
  },
  phone: {
    attributes: ['name*=phone', 'id*=phone', 'type=tel'],
    text: ['phone', 'telephone', 'mobile'],
    types: ['tel', 'text'],
  },
  address: {
    attributes: ['name*=address', 'name*=street', 'id*=address'],
    text: ['address', 'street'],
    types: ['text'],
  },
  auto_insurance_button: {
    attributes: ['data-product*=auto', 'href*=auto'],
    text: ['auto insurance', 'car insurance', 'vehicle insurance'],
    types: ['button', 'link'],
  },
  start_quote_button: {
    attributes: ['data-action*=quote', 'name*=quote', 'id*=quote'],
    text: ['start quote', 'get quote', 'quote', 'start my quote'],
    types: ['button', 'submit'],
  },
  continue_button: {
    text: ['continue', 'next', 'proceed'],
    attributes: ['type=submit'], // universal submit buttons
    types: ['button', 'submit'],
  },
  street: {
    attributes: ['name*=street', 'id*=street', 'placeholder*=street', 'name*=address', 'id*=address'],
    text: ['street', 'address'],
    types: ['text'],
  },
  city: {
    attributes: ['name*=city', 'id*=city', 'placeholder*=city'],
    text: ['city', 'town'],
    types: ['text'],
  },
  state: {
    attributes: ['name*=state', 'id*=state', 'placeholder*=state'],
    text: ['state', 'province'],
    types: ['text', 'select'],
  },
  vehicleyear: {
    attributes: ['name*=year', 'id*=year', 'placeholder*=year'],
    text: ['year'],
    types: ['text', 'select'],
  },
  vin: {
    attributes: ['name*=vin', 'id*=vin', 'placeholder*=vin'],
    text: ['vin'],
    types: ['text'],
  },
  driverlicense: {
    attributes: ['name*=license', 'id*=license', 'placeholder*=license'],
    text: ['driver license', 'license number'],
    types: ['text'],
  },
  ssn: {
    attributes: ['name*=ssn', 'id*=ssn', 'placeholder*=ssn'],
    text: ['ssn', 'social security'],
    types: ['text', 'password'],
  },
  current_insurer: {
    attributes: ['name*=current', 'name*=insur', 'id*=current', 'id*=insur'],
    text: ['current insurer', 'current insurance'],
    types: ['select', 'text'],
  },
  dob_month: {
    attributes: ['name*=month', 'id*=month', 'placeholder*=mm'],
    text: ['month'],
    types: ['text', 'select'],
  },
  dob_day: {
    attributes: ['name*=day', 'id*=day', 'placeholder*=dd'],
    text: ['day'],
    types: ['text', 'select'],
  },
  dob_year: {
    attributes: ['name*=year', 'id*=year', 'placeholder*=yyyy', 'placeholder*=year'],
    text: ['year'],
    types: ['text', 'select'],
  },
};

/**
 * Attempt to derive a stable selector for an element that fulfils the requested
 * purpose (e.g. "zipcode" input, "continue_button", etc.). Returns `null` if
 * the element does not satisfy the heuristics.
 */
export function identifyFieldByPurpose(element: SnapshotElement, purpose: string): string | null {
  const { tag, attributes = {}, text, ref } = element;

  // Skip obviously irrelevant tags unless we're looking for generic buttons/links.
  if (!['input', 'select', 'textarea', 'button', 'a'].includes((tag || '').toLowerCase())) {
    if (purpose !== 'button' && purpose !== 'link') return null;
  }

  const pattern = fieldPatterns[purpose];
  if (!pattern) return null;

  // Attribute-based heuristics
  if (pattern.attributes) {
    for (const attrPattern of pattern.attributes) {
      if (matchesAttributePattern(attributes, attrPattern)) {
        const [attr, condition] = attrPattern.split('*=');
        const selector = attrPattern.includes('*=')
          ? `${tag}[${attr}*="${condition}"]`
          : `${tag}[${attr}="${condition}"]`;
        return selector;
      }
    }
  }

  // Label/text heuristics
  if (pattern.text && text) {
    for (const textPattern of pattern.text) {
      if (text.toLowerCase().includes(textPattern.toLowerCase())) {
        return ref || buildSelector(element);
      }
    }
  }

  // Input type check
  if (pattern.types && attributes.type) {
    if (pattern.types.includes(attributes.type.toLowerCase())) {
      return ref || buildSelector(element);
    }
  }

  // Max-length (e.g. 5 char ZIP)
  if (pattern.maxlength && attributes.maxlength) {
    if (pattern.maxlength.includes(parseInt(attributes.maxlength))) {
      return ref || buildSelector(element);
    }
  }

  return null;
} 