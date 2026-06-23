//just a simple component to display the qr code and the caption and the value yea
'use client'
  import { QRCodeSVG } from 'qrcode.react'

  export function QrLabel({ value, caption }: { value: string; caption: string }) {
    return (
      <div className="qr-label flex flex-col items-center gap-2 bg-white p-4 rounded-lg">
        <QRCodeSVG value={value} size={160} level="M" />
        <span className="text-sm font-semibold text-black">{caption}</span>
        <span className="font-mono text-[10px] text-black break-all">{value}</span>
      </div>
    )
  }