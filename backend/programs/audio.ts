import { init_nats } from "@deno-plc/nats";
import { wsconnect } from "jsr:@nats-io/nats-core@^3.0.2";
import { TFVolumeControl } from "../../interfaces/tf/volume_control.ts";
import { nats } from "../../backend/backend.ts";

export async function startAudioAndConnect() {
    console.error("\x1b[0;36mConnecting to nats-server...\x1b[0;0m");

    nats[0] = true;

    setTimeout(() => {
        if (!nats[0]) {
            console.error("\x1b[0;31m✗ Failed to connect to nats-server\x1b[0;0m");
        }
    }, 3000);

    await init_nats(wsconnect.bind(self, {
        servers: ["ws://localhost:10001"],
    }));

    console.error("\x1b[0;32m✓ Connected to nats-server\x1b[0;0m");

    const volume_control = new TFVolumeControl(1, [
        { address: 300, channel: 9, channel_type: "InCh" },
        { address: 301, channel: 16, channel_type: "InCh" },
    ], {
        allow_full: false,
    });

    volume_control.listen().catch(console.error);
}
