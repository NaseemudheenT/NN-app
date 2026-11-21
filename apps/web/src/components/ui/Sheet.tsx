import { Dialog, type DialogProps } from "./Dialog";

/** A bottom-anchored modal sheet with Dialog's focus trap and dismissal rules. */
export type SheetProps = Omit<DialogProps, "placement">;

export function Sheet(props: SheetProps) {
  return <Dialog {...props} placement="bottom" />;
}

export default Sheet;
