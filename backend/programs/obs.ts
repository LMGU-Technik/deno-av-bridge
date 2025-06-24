import { ObsConnection } from "@bewis09/obs-interface";
import { OBSSceneControl } from "../../interfaces/obs/scene_control.ts";

export function startOBSAndConnect() {
    const command = new Deno.Command(Deno.env.get("OBS_EXECUTABLE")!, {
        cwd: Deno.env.get("OBS_PATH")!,
    });

    command.spawn();

    ObsConnection.initalize("localhost", 4455, Deno.env.get("OBS_PASSWORD") || "").then((obs) => {
        const obs_scene_control = new OBSSceneControl(
            1,
            310,
            obs,
            ["", "", "Handy", "", "Black"],
            Deno.env.get("OBS_PASSWORD") || "",
        );

        obs_scene_control.listen().catch(console.error);
    });
}
