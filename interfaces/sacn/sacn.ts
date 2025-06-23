import { bufferEqual } from "https://deno.land/x/sacn@v1.0.2/lib/util.ts";
import { Receiver } from "jsr:@deno-plc/sacn";
import { sACNSource } from "https://deno.land/x/sacn@v1.0.2/src/receiver.ts";
import { BIND_IP } from "../../backend/config.ts";

export class SACNSingleUniverseReceiver {
    private receiver: Receiver | null = null;

    private readonly lastSourceData = new WeakMap<
        sACNSource,
        Map<number, [Uint8Array, number]>
    >();

    readonly sources = new Set<sACNSource>();

    private readonly lastChanData = new Map<number, number>();

    constructor(
        private universe: number,
        private onPacket: (data: number[]) => Promise<void>,
    ) { }

    getSource(cid: Uint8Array): sACNSource | null {
        for (const source of this.sources) {
            if (bufferEqual(source.cid, cid)) {
                return source;
            }
        }
        return null;
    }

    async listen() {
        this.receiver = new Receiver({
            iface: BIND_IP
        });

        await this.receiver.addUniverse(this.universe);

        for await (const packet of this.receiver.onPacket()) {
            const packetSource = this.getSource(packet.cid)! || {
                cid: packet.cid,
                label: packet.sourceLabel,
                priority: packet.priority,
            };

            if (!this.lastSourceData.has(packetSource)) {
                this.lastSourceData.set(packetSource, new Map());
            }

            this.lastSourceData.get(packetSource)!.set(packet.universe, [
                packet.data,
                packet.priority,
            ]);

            const sources = new Map<number, Set<sACNSource>>();

            let highestPriority = -1;

            for (const source of this.sources) {
                const lastSourceData = this.lastSourceData.get(source)?.get(
                    packet.universe,
                );
                if (lastSourceData) {
                    const [, priority] = lastSourceData;
                    if (priority < highestPriority) {
                        continue;
                    }

                    if (!sources.has(priority)) {
                        sources.set(priority, new Set());
                    }

                    sources.get(priority)!.add(source);

                    highestPriority = Math.max(highestPriority, priority);
                }
            }

            const highPrioritySources = sources.get(highestPriority)!;

            const sourceData = [...highPrioritySources].map((source) =>
                this.lastSourceData.get(source)!.get(packet.universe)![0]
            );

            const universeBase = (packet.universe - 1) * 512;

            let update = false;

            for (let i = 1; i < 513; i++) {
                const globChan = universeBase + i;
                let highest = 0;
                for (const data of sourceData) {
                    if (data[i] > highest) {
                        highest = data[i];
                    }
                }
                const old = this.lastChanData.get(globChan) ?? -1;
                if (old !== highest) {
                    this.lastChanData.set(globChan, highest);
                    update = true;
                }
            }

            if (update) {
                await this.onPacket(this.lastChanData.entries().reduce((prev, curr) => {
                    const [key, value] = curr;
                    prev[key] = value;
                    return prev;
                }, [] as number[])).catch(console.error)
            }
        }
    }

    close() {
        if (this.receiver) {
            this.receiver.dispose();
            this.receiver = null;
        }
    }
}