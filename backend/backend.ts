import { parseArgs } from "jsr:@std/cli/parse-args";
import { startAudioAndConnect } from "./programs/audio.ts";
import { startOBSAndConnect } from "./programs/obs.ts";
import { startVLCandConnect } from "./programs/vlc.ts";

export const nats = [false], vlc = [false], obs = [false];

const args = parseArgs(Deno.args, {
    boolean: ["obs", "audio"],
    string: ["vlc"],
});

if (args.audio) {
    startAudioAndConnect();
}

if (args.obs) {
    startOBSAndConnect();
}

if (args.vlc) {
    startVLCandConnect();
}
