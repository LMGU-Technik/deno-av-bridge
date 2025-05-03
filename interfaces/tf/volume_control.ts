import { globalToDmx, Receiver } from "https://deno.land/x/sacn@v1.0.2/mod.ts";
import { try_get_nats } from "@deno-plc/nats";
import { encode } from "jsr:@std/msgpack@^1.0.3/encode";

const points: [number, number][] = [
    [10_00, 0],
    [-10_00, 0.4],
    [-60_00, 0.9],
    [-32768, 1],
];

export type addressed_channel = {
    address: number;
    channel: number;
    channel_type: "InCh" | "StInCh" | "FxRtnCh" | "DCA" | "DcaCh" | "Mix" | "Mtrx" | "St" | "Mono"
};

export type tf_volume_control_options = {
    /**
     * Sets if 100% volume is allowed or if it should be seen as a mistake.
     * 
     * If this is enabled, when the volume is set to 100% it must be set to 0% again before it transmits a value again.
     * 
     * Default: false
     */
    allow_full?: boolean;
}

export class TFVolumeControl {
    readonly options: tf_volume_control_options;
    blocked_channels: number[] = [];

    private receiver: Receiver | null = null;

    constructor(
        readonly universe: number, 
        readonly channels: addressed_channel[], 
        options?: tf_volume_control_options
    ) {
        this.universe = universe;
        this.channels = channels;
        this.options = options || {};

        console.log(`Initalized tf volume control for addresses ${this.channels.map((c) => c.address).join(", ")} in universe ${this.universe}`);
        
    }

    async listen() {
        this.receiver = new Receiver();

        await this.receiver.addUniverse(this.universe);
        
        for await (const [a, value] of this.receiver) {
            const [_, addr] = globalToDmx(a);

            this.channels.filter((c) => c.address == addr).forEach((c) => {
                if (this.blocked_channels.includes(c.address)) {
                    if (value > 0) {
                        return;
                    }

                    console.log(`%cUnblocking channel ${c.channel_type} ${c.channel}`, "color: green;");

                    this.blocked_channels = this.blocked_channels.filter((v) => v != c.address);
                }

                if (!this.options.allow_full && value == 255) {
                    console.error(`%cBlocking channel ${c.channel_type} ${c.channel} because the volume is set to 100%. This is probably a mistake.`, "color: red;");

                    this.blocked_channels.push(c.address);

                    return;
                }

                try_get_nats()?.publish(`tf.mixer.${c.channel_type}.${c.channel}.fader.level`, encode(fader2db(value / 255)));
            });
        }
    }

    close() {
        if (this.receiver) {
            this.receiver.dispose()
            this.receiver = null;
        }
    }
}

export function fader2db(level: number) {
    const sorted = points.sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < sorted.length; i++) {
        const val = sorted[i]![1];
        if (val === level) {
            return sorted[i]![0];
        }
        if (val > level) {
            if (i === 0) {
                return NaN;
            } else {
                return Math.round(map(level, sorted[i - 1]![1], sorted[i]![1], sorted[i - 1]![0], sorted[i]![0]));
            }
        }
    }
    return NaN;
}

function map(x: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}