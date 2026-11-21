import { ImageResponse } from "next/og";
import { NN_MARK_PATH } from "@/components/ui/NNLogo";

/** The NN application icon: one crisp mark, centred on the system ground. */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#09090b"}}>
      <svg width="248" height="224" viewBox="0 0 120 108">
        <path d={NN_MARK_PATH} fill="#FFFFFF"/>
      </svg>
    </div>,
    size,
  );
}
