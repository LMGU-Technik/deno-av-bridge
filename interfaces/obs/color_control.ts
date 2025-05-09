import { globalToDmx, Receiver } from "https://deno.land/x/sacn@v1.0.2/mod.ts";
import { ObsConnection, RequestTypes } from "@bewis09/obs-interface";
import { BIND_IP } from "../../backend/config.ts";

export class OBSColorControl {
    private receiver: Receiver | null = null;
    private colors: { [source: string]: [red: number, green: number, blue: number] } = {};

    constructor(
        public universe: number,
        public obs: ObsConnection,
        public controls: {
            dmx_start: number,
            inputName: string,
        }[]
    ) {
        this.universe = universe;
        this.controls = controls;
    }

    async listen() {
        this.receiver = new Receiver({
            iface: BIND_IP
        });

        await this.receiver.addUniverse(this.universe);

        for await (const [a, value] of this.receiver) {
            const [_, addr] = globalToDmx(a);

            this.controls.forEach((control) => {
                if (addr - control.dmx_start > 2 || addr < control.dmx_start) return;

                const inputName = control.inputName;

                this.colors[inputName] = this.colors[inputName] || [0, 0, 0];
                this.colors[inputName][addr - control.dmx_start] = value;

                const [red, green, blue] = this.colors[inputName];

                const color = 0xFF << 24 | (blue << 16) | (green << 8) | red;

                this.obs.sendRequest(RequestTypes.SetInputSettings, {
                    inputName: inputName,
                    inputSettings: {
                        color: color,
                    },
                }).catch(console.error);
            })
        }
    }

    close() {
        if (this.receiver) {
            this.receiver.dispose()
            this.receiver = null;
        }
    }
}