//just a simple component to display the qr code and the caption and the value yea
'use client'
import { QRCodeSVG } from 'qrcode.react'

export function QrLabel({ value, caption }: { value: string; caption: string }) {
  return (
    <div className="
      qr-label flex flex-col items-center gap-2 bg-white p-4 rounded-lg
      print:m-0 print:p-0 print:border-none print:shadow-none 
      print:justify-center print:h-screen print:w-full print:break-after-page
    ">
      {/* Wrapper to scale the QR code up on paper */}
      <div className="print:scale-[2.5] print:mb-16">
        <QRCodeSVG value={value} size={160} level="M" />
      </div>
      
      {/* Wrapper to scale the text up on paper */}
      <div className="flex flex-col items-center print:mt-16 text-center">
        <span className="text-sm font-bold text-black print:text-5xl">{caption}</span>
        <span className="font-mono text-[10px] text-black break-all print:text-2xl print:mt-4">{value}</span>
      </div>
    </div>
  )
}