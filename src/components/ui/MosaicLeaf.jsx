import logoUrl from "../../assets/FINAL.png";

export function MosaicLeaf({ size = 22 }) {
  return (
    <img
      src={logoUrl}
      alt=""
      width={size}
      height={size}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}
