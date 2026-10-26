// Images on the marketing pages. Two kinds, deliberately treated differently:
//   ProductShot — evidence: a real /demo screenshot, flat, 1px border, 3px radius.
//   Material    — air: a macro still whose background already equals the page, no border.
// Both always carry explicit width/height so nothing shifts while loading.

type ShotName = 'shot-obituary' | 'shot-dashboard';
type MaterialName = 'lipstick-section' | 'powder-arc' | 'pipette-drop' | 'lips-profile';

// Intrinsic pixel sizes of the committed files (shots are captured at 2×).
const SHOTS: Record<ShotName, { w: number; h: number; alt: string }> = {
  'shot-obituary': { w: 912, h: 450, alt: 'Rouge flags a critical recommendation: scale the retargeting budget, with the ROAS figure and the rule behind it' },
  'shot-dashboard': { w: 2088, h: 1362, alt: 'The Rouge dashboard: KPI strip, benchmark comparison, recommendations and the chat panel' },
};
const MATERIAL: Record<MaterialName, { alt: string; w: number; h: number }> = {
  'lipstick-section': { alt: 'A lipstick bullet cut across at an angle', w: 2000, h: 1300 },
  'powder-arc': { alt: 'Ivory powder swept in one arc', w: 2000, h: 1300 },
  'pipette-drop': { alt: 'A glass pipette holding one red drop', w: 2000, h: 1300 },
  'lips-profile': { alt: 'A face in profile, cropped to the lips and jaw, in matte red lipstick', w: 2016, h: 1344 },
};

export function ProductShot({ name, lazy = true, className = '' }: { name: ShotName; lazy?: boolean; className?: string }) {
  const s = SHOTS[name];
  return (
    <picture className={`mk-shot ${className}`}>
      <source srcSet={`/img/product/${name}.webp`} type="image/webp" />
      <img src={`/img/product/${name}.png`} width={s.w} height={s.h} alt={s.alt}
        loading={lazy ? 'lazy' : 'eager'} decoding="async" />
    </picture>
  );
}

export function Material({ name, className = '' }: { name: MaterialName; className?: string }) {
  return (
    <picture className={`mk-material ${className}`}>
      <source srcSet={`/img/material/${name}.webp`} type="image/webp" />
      <img src={`/img/material/${name}.png`} width={MATERIAL[name].w} height={MATERIAL[name].h} alt={MATERIAL[name].alt}
        loading="lazy" decoding="async" />
    </picture>
  );
}
