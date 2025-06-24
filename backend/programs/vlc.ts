import { VLCControlInterface } from "../../interfaces/vlc/vlc_control.ts";

export async function startVLCandConnect(path: string) {
    const command = new Deno.Command(Deno.env.get("VLC_EXECUTABLE")!, {
        cwd: Deno.env.get("VLC_PATH")!,
        args: [
            await Deno.realPath("data/" + path + ".xspf"),
        ],
    });

    command.spawn();

    const vlc_control = new VLCControlInterface(1, 330, "localhost", 4212);

    vlc_control.listen().catch(console.error);
}
