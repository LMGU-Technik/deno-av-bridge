import { OBSColorControl } from "../interfaces/obs/color_control.ts";
import { OBSSceneControl } from "../interfaces/obs/scene_control.ts";
import { TFVolumeControl } from "../interfaces/tf/volume_control.ts";
import { ObsConnection, RequestTypes } from "@bewis09/obs-interface";
import { VLCControlInterface } from "../interfaces/vlc/vlc_control.ts";
import { SACNSingleUniverseReceiver } from "../interfaces/sacn/sacn.ts";
import { init_nats } from "@deno-plc/nats";
import { wsconnect } from "jsr:@nats-io/nats-core@^3.0.2";
import { BIND_IP } from "./config.ts";
import { Receiver } from "jsr:@deno-plc/sacn";

await init_nats(wsconnect.bind(self, {
    servers: ["ws://localhost:1001"],
}));

// export const universe_test_receiver = new SACNSingleUniverseReceiver(1, (data) => {
//     console.log(data);

//     return Promise.resolve();
// })

// await universe_test_receiver.listen().catch(console.error);

export const volume_control = new TFVolumeControl(1, [
    { address: 300, channel: 0, channel_type: "StInCh" },
    { address: 301, channel: 2, channel_type: "StInCh" },
], {
    allow_full: false,
})

ObsConnection.initalize("localhost", 4455, Deno.env.get("OBS_PASSWORD") || "").then(async (obs) => {

    const obs_scene_control = new OBSSceneControl(
        1,
        310,
        obs,
        ["", "", "Handy", "", "Black"],
        Deno.env.get("OBS_PASSWORD") || "",
    )

    const obs_color_control = new OBSColorControl(
        1,
        obs,
        [
            { dmx_start: 320, inputName: "Farbquelle" },
        ]
    )

    obs_scene_control.listen().catch(console.error);
    obs_color_control.listen().catch(console.error);
})

export const vlc_control = new VLCControlInterface(1, 330, "localhost", 4212);

volume_control.listen().catch(console.error);
vlc_control.listen().catch(console.error);
