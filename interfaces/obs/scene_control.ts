import { ObsConnection, RequestTypes } from "@bewis09/obs-interface"
import { globalToDmx, Receiver } from "jsr:@deno-plc/sacn";
import { BIND_IP } from "../../backend/config.ts";

export class OBSSceneControl {
    private receiver: Receiver | null = null;
    last_scene: number = 0;

    constructor(
        readonly universe: number,
        readonly scene_channel: number,
        readonly obs: ObsConnection | undefined,
        readonly scene_names: string[],
        readonly password: string,
    ) {
        this.password = password;
    }

    async listen() {
        this.receiver = new Receiver({
            iface: BIND_IP
        });

        await this.receiver.addUniverse(this.universe);

        for await (const [a, value] of this.receiver) {
            const [universe, addr] = globalToDmx(a)

            if (addr != this.scene_channel || universe != this.universe) continue;

            if (!this.obs) continue;

            if (value == 0) continue;

            const scene = this.scene_names[value - 1];

            if (!scene) continue;

            if (this.last_scene == value) continue;

            this.last_scene = value;
            
            await this.obs.sendRequest(RequestTypes.SetCurrentProgramScene, {
                sceneName: scene,
            })

            console.log(`Set OBS scene to ${scene}`);
        }
    }

    close() {
        if (this.receiver) {
            this.receiver.dispose()
            this.receiver = null;
        }
    }
}