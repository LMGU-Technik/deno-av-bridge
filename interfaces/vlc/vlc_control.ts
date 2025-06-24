import {
    TCPAdapter,
    TCPAdapterCallback,
    TCPAdapterSession,
} from "@deno-plc/adapter-tcp";
import { globalToDmx, Receiver } from "jsr:@deno-plc/sacn";
import { BIND_IP } from "../../backend/config.ts";

let send_tcp: TCPAdapterCallback | undefined = undefined;
let firstElement = 4;
let lastElement = 0;

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
        this.receiver = new Receiver({
            iface: BIND_IP
        });

        await this.receiver.addUniverse(this.universe);

        let waitPosition: number | undefined = undefined;

        for await (const [a, value] of this.receiver) {
            const [universe, addr] = globalToDmx(a);

            if (universe !== this.universe) continue;

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

            if ((value == 0) || (value > lastElement - firstElement + 1)) {
                send_tcp?.(new TextEncoder().encode("pause\n"));
                continue;
            }

            if (this.last_value == value) {
                send_tcp?.(new TextEncoder().encode("play\n"));
                continue;
            }

            send_tcp?.(new TextEncoder().encode("gotoitem " + (value + firstElement - 1) + "\n"));
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

        setTimeout(() => {
            send(new TextEncoder().encode("playlist\n"));
        }, 100);
    }

    recv(_: Uint8Array): void {
        const data = new TextDecoder().decode(_);
        const lines = data.split("\n");
        let isPlaylist = false;

        for (const line of lines) {
            if (line.startsWith("|  *")) {
                isPlaylist = true;
                firstElement = Number(line.substring(4).split(" ")[0])
            }

            if (line.startsWith("| ") && !line.startsWith("|  ") && isPlaylist) {
                isPlaylist = false;
                const last = lines[lines.indexOf(line) - 1];
                lastElement = Number(last.substring(4).split(" ")[0])
            }
        }
    }

    destroy(): void {

    }
}