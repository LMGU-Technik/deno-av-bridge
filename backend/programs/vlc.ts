import { VLCControlInterface } from "../../interfaces/vlc/vlc_control.ts";
import { vlc } from "../backend.ts";

// deno-lint-ignore require-await
export async function startVLCandConnect() {
    console.error("\x1b[0;36mConnecting to VLC...\x1b[0;0m");

    setTimeout(() => {
        if (!vlc[0]) {
            console.error("\x1b[0;31m✗ Failed to connect to VLC\x1b[0;0m");
        }
    }, 3000);

    const vlc_control = new VLCControlInterface(1, 330, "localhost", 4212);

    vlc_control.listen().catch(console.error);
}
