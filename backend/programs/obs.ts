import { ObsConnection } from "@bewis09/obs-interface";
import { OBSSceneControl } from "../../interfaces/obs/scene_control.ts";
import { obs as _obs } from "../../backend/backend.ts";

// deno-lint-ignore require-await
export async function startOBSAndConnect() {
    console.error("\x1b[0;36mConnecting to OBS-Websocket...\x1b[0;0m");

    setTimeout(() => {
        if (!_obs[0]) {
            console.error("\x1b[0;31m✗ Failed to connect to OBS-Websocket\x1b[0;0m");
        }
    }, 3000);

    ObsConnection.initalize("localhost", 4455, Deno.env.get("OBS_PASSWORD") || "").then((obs) => {
        console.error("\x1b[0;32m✓ Connected to OBS-Websocket\x1b[0;0m");

        _obs[0] = true;

        const obs_scene_control = new OBSSceneControl(
            1,
            310,
            obs,
            ["Black", "Handy"],
            Deno.env.get("OBS_PASSWORD") || "",
        );

        obs_scene_control.listen().catch(console.error);
    });
}
