declare module 'react-barcode' {
  import * as React from 'react';

  export interface BarcodeProps {
    value: string;
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    text?: string;
    fontOptions?: string;
    font?: string;
    textAlign?: string;
    textPosition?: string;
    textMargin?: number;
    fontSize?: number;
    background?: string;
    lineColor?: string;
    margin?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    className?: string;
  }

  export default class Barcode extends React.Component<BarcodeProps> {}
}
