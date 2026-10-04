// Staff module constants and helpers

export interface DesignationOption {
  value: string;
  label: string;
}

export const DESIGNATION_OPTIONS: DesignationOption[] = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'physio', label: 'Physiotherapist' },
  { value: 'psychiatrist', label: 'Psychiatrist' },
  { value: 'attendant', label: 'Attendant' },
  { value: 'admin', label: 'Admin' },
  { value: 'other', label: 'Other' },
];

/** Returns the display label for a designation type + optional custom value. */
export function getDesignationLabel(type: string, custom?: string | null): string {
  if (type === 'other') {
    return custom?.trim() || 'Other';
  }
  const found = DESIGNATION_OPTIONS.find((o) => o.value === type);
  return found ? found.label : type;
}

/** Returns the initials for a person's full name (first two words). */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Six harmonious background color classes (inline styles since no Tailwind)
const AVATAR_COLORS = [
  { bg: '#1a5276', text: '#aed6f1' },
  { bg: '#196f3d', text: '#a9dfbf' },
  { bg: '#6e2f8c', text: '#d7bde2' },
  { bg: '#935116', text: '#f9e4b7' },
  { bg: '#1a535c', text: '#a2d9ce' },
  { bg: '#78281f', text: '#f5b7b1' },
];

/**
 * Returns a consistent color pair for an avatar based on the numeric part of the staff ID.
 * The same ID always gets the same color.
 */
export function getAvatarColor(staffId: string): { bg: string; text: string } {
  const match = staffId.match(/(\d+)/);
  const num = match ? parseInt(match[1], 10) : 0;
  return AVATAR_COLORS[num % AVATAR_COLORS.length];
}

/**
 * Returns a consistent color pair for a patient based on their numeric patient_id.
 */
export function getPatientAvatarColor(patientId: number): { bg: string; text: string } {
  return AVATAR_COLORS[patientId % AVATAR_COLORS.length];
}

export interface StaffMember {
  id: string;
  staff_id: string;
  name: string;
  father_husband_name: string;
  father_husband_name_type: 'father' | 'husband';
  gender: 'male' | 'female' | 'other';
  designation_type: string;
  designation_custom: string | null;
  address: string | null;
  contact_number: string;
  email: string | null;
  whatsapp: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  qualification: string | null;
  photo_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Formats a Pakistani phone number for WhatsApp: removes leading 0, adds 92 */
export function formatWhatsAppUrl(number: string): string {
  const cleaned = number.replace(/\s+/g, '').replace(/^\+/, '');
  const local = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
  const intl = local.startsWith('92') ? local : '92';
  return `https://wa.me/${intl}${local}`;
}

/** Try to extract lat/lng from a Google Maps URL */
export function extractLatLng(url: string): { lat: number; lng: number } | null {
  // Matches formats like @33.123456,73.123456 or ?q=33.123456,73.123456 or ll=33,73
  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  }
  return null;
}
