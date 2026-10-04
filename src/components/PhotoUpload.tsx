'use client';

import React, { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { validatePhotoFile } from '@/lib/photo';

interface PhotoUploadProps {
  /** Current photo URL (signed URL or data URL preview). */
  photoUrl?: string | null;
  /** Person's initials shown when no photo. */
  initials: string;
  /** Background color for initials avatar. */
  avatarBg?: string;
  /** Text color for initials. */
  avatarTextColor?: string;
  /** Whether to show the remove photo link. */
  allowRemove?: boolean;
  /** Called when a valid file is selected. Does not upload — upload happens on form save. */
  onFileSelected: (file: File, previewUrl: string) => void;
  /** Called when the user clicks Remove photo. */
  onRemove?: () => void;
  /** Size in pixels (default 96). */
  size?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photoUrl,
  initials,
  avatarBg = '#1a5276',
  avatarTextColor = '#aed6f1',
  allowRemove = false,
  onFileSelected,
  onRemove,
  size = 96,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    onFileSelected(file, previewUrl);
    e.target.value = '';
  };

  const handleRemove = () => {
    setError(null);
    onRemove?.();
  };

  const fontSize = Math.round(size * 0.33);

  return (
    <div className="photo-upload-wrapper" style={{ textAlign: 'center' }}>
      <div className="photo-upload-container" style={{ display: 'inline-block', position: 'relative' }}>
        {/* Circle avatar */}
        <div
          className="photo-avatar-circle"
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: photoUrl ? 'transparent' : avatarBg,
            color: avatarTextColor,
            fontSize,
            fontWeight: 700,
            letterSpacing: '-0.5px',
            border: '3px solid rgba(255,255,255,0.18)',
            boxShadow: '0 4px 18px rgba(0,0,0,0.22)',
            cursor: 'pointer',
            position: 'relative',
          }}
          onClick={handleClick}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Profile photo"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span>{initials || '?'}</span>
          )}
        </div>

        {/* Camera button */}
        <button
          type="button"
          className="photo-camera-btn"
          onClick={handleClick}
          title="Change photo"
          aria-label="Upload photo"
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a5276, #2980b9)',
            border: '2px solid rgba(255,255,255,0.85)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.16s',
          }}
        >
          <Camera size={13} />
        </button>
      </div>

      {/* Helper text */}
      <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2px' }}>
        JPG, PNG or WebP · max 2 MB
      </div>

      {/* Remove link */}
      {allowRemove && photoUrl && (
        <button
          type="button"
          className="photo-remove-btn"
          onClick={handleRemove}
          style={{
            display: 'block',
            margin: '4px auto 0',
            background: 'none',
            border: 'none',
            color: 'rgba(252,165,165,0.8)',
            fontSize: '0.68rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: '2px 0',
            textDecoration: 'underline',
          }}
        >
          Remove photo
        </button>
      )}

      {/* Validation error */}
      {error && (
        <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#f87171', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
};
