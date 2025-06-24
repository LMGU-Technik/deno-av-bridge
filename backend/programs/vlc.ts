import { VLCControlInterface } from "../../interfaces/vlc/vlc_control.ts";

export async function startVLCandConnect(path: string) {
    const vlc_control = new VLCControlInterface(1, 330, "localhost", 4212);

    vlc_control.listen().catch(console.error);
}
