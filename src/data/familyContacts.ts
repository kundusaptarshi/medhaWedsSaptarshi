export type FamilyKey = 'kundu' | 'bhattacharya';

export interface FamilyContactPerson {
  name: string;
  phone: string;
  telHref: string;
  whatsappHref: string;
}

export interface FamilyContactGroup {
  key: FamilyKey;
  title: string;
  subtitle: string;
  buttonLabel: string;
  contacts: FamilyContactPerson[];
}

function createContact(name: string, tenDigitPhone: string): FamilyContactPerson {
  const digits = tenDigitPhone.replace(/\D/g, '');
  return {
    name,
    phone: digits,
    telHref: `tel:+91${digits}`,
    whatsappHref: `https://wa.me/91${digits}`,
  };
}

export const FAMILY_CONTACTS: Record<FamilyKey, FamilyContactGroup> = {
  kundu: {
    key: 'kundu',
    title: 'Kundu Family',
    subtitle: "Groom's Family Contacts",
    buttonLabel: 'Contact Kundu Family',
    contacts: [
      createContact('Susanta', '9831391153'),
      createContact('Piyali', '7980577725'),
      createContact('Saptarshi', '9163245324'),
    ],
  },
  bhattacharya: {
    key: 'bhattacharya',
    title: 'Bhattacharya Family',
    subtitle: "Bride's Family Contacts",
    buttonLabel: 'Contact Bhattacharya Family',
    contacts: [
      createContact('Utpal', '9830139367'),
      createContact('Sudipta', '9836359573'),
      createContact('Medha', '9804020706'),
    ],
  },
};

/**
 * Returns link attributes for `tel:` Call links so mobile browsers, embedded
 * preview iframes, and in-app webviews reliably hand off to the native phone
 * dialer instead of blocking same-frame custom-protocol navigation.
 */
export function getPhoneLinkAttributes(): {
  target: '_blank';
  rel: 'noopener noreferrer';
} {
  return { target: '_blank', rel: 'noopener noreferrer' };
}

