"use client";

const avatars = [
  { initials: "MR", color: "#F4A261" },
  { initials: "LC", color: "#E76F51" },
  { initials: "JP", color: "#2A9D8F" },
  { initials: "AS", color: "#264653" },
  { initials: "DV", color: "#E9C46A" },
];

export function SocialProof() {
  return (
    <div className="flex items-center gap-2">
      {/* Stacked avatars */}
      <div className="flex -space-x-2">
        {avatars.map((avatar, index) => (
          <div
            key={index}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-stone-950 shadow-sm"
            style={{ backgroundColor: avatar.color, zIndex: avatars.length - index }}
          >
            {avatar.initials}
          </div>
        ))}
      </div>

      {/* Text */}
      <p className="text-[13px] text-white/80">
        <span className="font-medium">Tu negocio</span> puede hacer la diferencia con
        NuncaCierro
      </p>
    </div>
  );
}
