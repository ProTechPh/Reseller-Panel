'use client';

import React, { useState, useEffect } from 'react';
import { CldImage } from 'next-cloudinary';

interface ProductImageProps {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  fallback?: string;
}

export default function ProductImage({
  src,
  alt,
  width = 500,
  height = 500,
  className,
  style,
  fallback = '/images/logo.png',
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  // Reset error state if src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // If errored or missing src, render fallback image directly
  if (hasError || !src || !src.trim()) {
    return (
      <img
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
      />
    );
  }

  const cleanSrc = src.trim();
  const isCloudinaryUrl = cleanSrc.includes('res.cloudinary.com');
  const isLocalOrAbsoluteUrl = cleanSrc.startsWith('/') || cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://');
  const isCloudinaryPublicId = !isLocalOrAbsoluteUrl;

  const shouldUseCldImage = Boolean(
    cloudName &&
    (isCloudinaryUrl || isCloudinaryPublicId)
  );

  if (shouldUseCldImage) {
    return (
      <CldImage
        src={cleanSrc}
        width={width}
        height={height}
        crop={{
          type: 'auto',
          source: true,
        }}
        alt={alt}
        className={className}
        style={style}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      onError={() => setHasError(true)}
    />
  );
}
