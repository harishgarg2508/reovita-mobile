declare module 'react-native-qrcode-svg' {
  import type React from 'react';

  export interface QRCodeProps {
    value?: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    logo?: unknown;
    logoSize?: number;
    logoBackgroundColor?: string;
    logoMargin?: number;
    logoBorderRadius?: number;
    quietZone?: number;
    enableLinearGradient?: boolean;
    gradientDirection?: string[];
    linearGradient?: string[];
    getRef?: (c: unknown) => unknown;
    onError?: (error: unknown) => void;
  }

  const QRCode: React.ComponentType<QRCodeProps>;
  export default QRCode;
}

