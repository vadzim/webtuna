# WebTuna

Connecting machines.

Creates tunnels between computers over the web using WebRTC under the hood.

## Example

To connect to port 3000 on a server behind NAT, run on the server:

```bash
npx webtuna 3000
```

You'll see:

```
To access your port 3000, run on the client machine:
  webtuna 'SomEcOnNecTIonKeY' <SOME_PORT_HERE>
```

Then, on your local machine, run:

```bash
npx webtuna 'SomEcOnNecTIonKeY' 3000
```

## What It Is

A WebRTC-based port-forwarding tool that lets you share local ports over the internet using peer-to-peer connections. WebTuna enables secure, direct connections between machines without exposing your ports to the public internet or relying on a central relay.

## Features

- **Peer-to-Peer**: Direct connections between machines using WebRTC.
- **No Central Server**: No relay server or VPN required.
- **Secure**: End-to-end encrypted connections.
- **Simple**: Easy command-line interface.
- **Cross-Platform**: Works on any platform that supports Node.js.

## Usage

WebTuna works in two modes: **server** (share a port) and **client** (connect to a shared port).

### Basic Syntax

```bash
npx webtuna share <source> [destination_key]
```

- If `[destination_key]` is not provided, a random one is generated.

### Use Cases

1. **Remote Development**: Share your local development server with a colleague.
2. **Database Access**: Securely access a database running on another machine.
3. **Testing**: Test webhooks or APIs that must be accessible from the internet.
4. **Debugging**: Connect to your server's Node.js debug port in the cloud.

## How It Works

1. **Server Side**: WebTuna creates a WebRTC peer and listens for incoming connections. When a connection is established, it forwards traffic between the WebRTC connection and your local port.

2. **Client Side**: WebTuna connects to the remote peer and creates a local TCP server that forwards traffic to the remote service.

3. **Data Transfer**: All data is transmitted through the WebRTC connection, which provides end-to-end encryption.

## Troubleshooting

### Connection Issues

- Ensure both machines have internet access.
- Verify the connection key is correct.
- Ensure the local port is not already in use.
- Be aware that some networks may block WebRTC traffic.

### Performance

- WebRTC connections may have higher latency than direct connections.
- Bandwidth is limited by the slower of the two connections.
- Large file transfers may be slower than traditional methods.

## Security Considerations

- WebRTC connections are encrypted by default.
- Keep connection keys private to prevent unauthorized access.
- Only share ports with parties you trust.

## License

ISC License

## Contributing

Feel free to submit issues and enhancement requests!
