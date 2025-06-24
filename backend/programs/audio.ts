import { init_nats } from "@deno-plc/nats";
import { wsconnect } from "jsr:@nats-io/nats-core@^3.0.2";
import { TFVolumeControl } from "../../interfaces/tf/volume_control.ts";

export async function startAudioAndConnect() {
    await init_nats(wsconnect.bind(self, {
        servers: ["ws://localhost:10001"],
    }));

    const volume_control = new TFVolumeControl(1, [
        { address: 300, channel: 9, channel_type: "InCh" },
        { address: 301, channel: 16, channel_type: "InCh"}
    ], {
        allow_full: false,
    });

    volume_control.listen().catch(console.error);
}
