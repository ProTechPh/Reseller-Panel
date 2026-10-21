'use client';

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Cloud, Loader2 } from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';
import ProductImage from './ProductImage';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

export default function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // Handle direct local file upload to /api/admin/upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size cannot exceed 10MB.');
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      onChange(data.url);
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Product Image / Logo</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-crimson)',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <X size={12} /> Remove Image
          </button>
        )}
      </label>

      {/* Upload Controls Row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />

        {/* 1. Device File Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn btn-secondary"
          style={{
            flex: 1,
            padding: '9px 12px',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            minWidth: '150px',
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={14} color="#38bdf8" />
              <span>Upload Image File</span>
            </>
          )}
        </button>

        {/* 2. Cloudinary Upload Widget */}
        {cloudName ? (
          <CldUploadWidget
            uploadPreset={uploadPreset || 'reseller_products'}
            signatureEndpoint="/api/admin/cloudinary-sign"
            options={{
              sources: ['local', 'url'],
              multiple: false,
              maxFiles: 1,
            }}
            onSuccess={(result: any) => {
              if (result?.info?.secure_url) {
                onChange(result.info.secure_url);
              } else if (result?.info?.public_id) {
                onChange(result.info.public_id);
              }
            }}
          >
            {({ open }) => (
              <button
                type="button"
                onClick={() => open()}
                className="btn btn-secondary"
                style={{
                  padding: '9px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                }}
              >
                <Cloud size={14} />
                <span>Cloudinary Widget</span>
              </button>
            )}
          </CldUploadWidget>
        ) : null}
      </div>

      {uploadError && (
        <p style={{ color: 'var(--accent-crimson)', fontSize: '0.75rem', margin: 0 }}>
          {uploadError}
        </p>
      )}

      {/* Manual Input or Cloudinary Public ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Or paste image URL / Cloudinary ID (e.g. cld-sample-5)..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontSize: '0.82rem', padding: '8px 12px' }}
        />
      </div>

      {/* Live Preview Box */}
      {value && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#0a0a0e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
          }}>
            <ProductImage
              src={value}
              alt="Preview"
              width={88}
              height={88}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>Image Selected</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {value}
            </div>
          </div>
        </div>
      )}

      {/* Preset Quick Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '4px' }}>Quick:</span>
        {[
          { name: 'CODM', path: '/images/codm.png' },
          { name: 'DFM', path: '/images/deltaforcemobile.png' },
          { name: 'PUBG', path: '/images/pubg.png' },
          { name: '8-Ball', path: '/images/8ballpool.png' },
          { name: 'MLBB', path: '/images/mlbb.png' },
          { name: 'Ghosst', path: '/images/Ghosst.png' },
          { name: 'Bloodstrike', path: '/images/bloodstrike.png' },
        ].map((img) => (
          <button
            key={img.name}
            type="button"
            onClick={() => onChange(img.path)}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              background: value === img.path ? '#00f0ff' : 'rgba(255,255,255,0.06)',
              border: value === img.path ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.1)',
              color: value === img.path ? '#04090e' : 'var(--text-secondary)',
              fontWeight: value === img.path ? 800 : 500,
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            {img.name}
          </button>
        ))}
      </div>
    </div>
  );
}
