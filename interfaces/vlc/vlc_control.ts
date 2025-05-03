import {
    TCPAdapter,
    TCPAdapterCallback,
    TCPAdapterSession,
} from "@deno-plc/adapter-tcp";
import { globalToDmx, Receiver } from "https://deno.land/x/sacn@v1.0.2/mod.ts";

let send_tcp: TCPAdapterCallback | undefined = undefined;

export class VLCControlInterface extends TCPAdapter {
    private receiver: Receiver | null = null;
    private last_value: number = 0;

    private position: number = 0;

    constructor(
        private universe: number,
        private addr: number,
        host: string,
        port: number,
    ) {
        super({
            host: host,
            port: port,
            label: "vlc",
            sessionFactory: (send: TCPAdapterCallback) => {
                return new VLCControlProtocolAdapterSession(this, send);
            }
        });
    }

    async listen() {
        this.receiver = new Receiver();

        await this.receiver.addUniverse(this.universe);

        let waitPosition: number | undefined = undefined;

        for await (const [a, value] of this.receiver) {
            const [_, addr] = globalToDmx(a);

            if (addr == this.addr + 1) {
                this.position = (this.position % 0xFF) + (value << 8)

                if (waitPosition) continue;

                waitPosition = setTimeout(() => {
                    send_tcp?.(new TextEncoder().encode("seek " + this.position + "\n"));
                    waitPosition = undefined;
                }, 100);
            }

            if (addr == this.addr + 2) {
                this.position = (this.position & 0xFF00) + value

                if (waitPosition) continue;

                waitPosition = setTimeout(() => {
                    waitPosition = undefined;
                    send_tcp?.(new TextEncoder().encode("seek " + this.position + "\n"));
                }, 100);
            }

            if (addr != this.addr) {
                continue;
            }

            if (value == 0) {
                send_tcp?.(new TextEncoder().encode("pause\n"));
                continue;
            }

            if (this.last_value == value) {
                send_tcp?.(new TextEncoder().encode("play\n"));
                continue;
            }

            send_tcp?.(new TextEncoder().encode("gotoitem " + (value + 3) + "\n"));
            this.last_value = value;

            if (waitPosition) continue;

            waitPosition = setTimeout(() => {
                waitPosition = undefined;
                send_tcp?.(new TextEncoder().encode("seek " + this.position + "\n"));
            }, 100);
        }
    }
}

class VLCControlProtocolAdapterSession implements TCPAdapterSession {
    constructor(readonly adapter: VLCControlInterface, send: TCPAdapterCallback) {
        console.log("Connected to VLC control interface");

        send(new TextEncoder().encode("password\n"));
        send_tcp = send;
    }

    recv(_: Uint8Array): void {

    }

    destroy(): void {

    }
}