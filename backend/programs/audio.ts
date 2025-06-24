import { init_nats } from "@deno-plc/nats";
import { wsconnect } from "jsr:@nats-io/nats-core@^3.0.2";
import { TFVolumeControl } from "../../interfaces/tf/volume_control.ts";

export async function startAudioAndConnect() {
    const command = new Deno.Command("nats-server", {
        args: ["-c", "nats.conf"],
    });

    command.spawn();

    await init_nats(wsconnect.bind(self, {
        servers: ["ws://localhost:1001"],
    }));

    const volume_control = new TFVolumeControl(1, [
        { address: 300, channel: 0, channel_type: "StInCh" },
        { address: 301, channel: 2, channel_type: "StInCh" },
    ], {
        allow_full: false,
    });

    volume_control.listen().catch(console.error);
}
