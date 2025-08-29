#!/usr/bin/env node

import { once } from "events"
import { randomUUID } from "crypto"
import net from "net"

const { Peer } = await importPeerjs()

{
	class EBadArguments extends Error {}

	try {
		const [command, source, destination] = process.argv.slice(2)

		const isNumber = value => value === String(parseInt(value))

		switch (command) {
			case "share": {
				if (!isNumber(source)) {
					throw new EBadArguments()
				}
				await runServer(createLogger("server"), +source, destination || createId())
				break
			}
			case "connect": {
				if (!isNumber(destination)) {
					throw new EBadArguments()
				}
				await runClient(createLogger("client"), source, +destination)
				break
			}
			default: {
				throw new EBadArguments()
			}
		}
	} catch (e) {
		if (e instanceof EBadArguments) {
			console.error("Usage:")
			console.error("  webtuna share <source_port> [destination_key]")
			console.error("  webtuna connect <source_key> <destination_port>")
			console.error("  If 'destination_key' is omitted, a random one is generated.")
			process.exit(1)
		}
		throw e
	}
}

//
//
async function runServer(
	/** @type {ReturnType<typeof createLogger>} */ logger,
	/** @type {number} */ source,
	/** @type {string} */ destination,
) {
	console.log(`To access your port ${source}, run on the client machine:`)
	console.log(`  webtuna '${destination}' <LOCAL_PORT>`)
	console.log()

	logger.log(`Sharing port ${source} with key ${destination}`)

	const peer = new Peer(destination)
	await once(peer, "open")

	logger.log("Peer opened")

	peer.on("connection", async connection => {
		await once(connection, "open")

		logger.log("Connection opened")

		createConnectionSockets(
			logger,
			connection,
			() =>
				new Promise((resolve, reject) => {
					logger.log("New incoming connection")

					const socket = net.connect(source, () => resolve(socket)).on("error", reject)
				}),
		)
	})
}

//
//
async function runClient(
	/** @type {ReturnType<typeof createLogger>} */ logger,
	/** @type {string} */ source,
	/** @type {number} */ destination,
) {
	logger.log(`Connecting local port ${destination} to ${source}`)

	const peer = new Peer()

	peer.on("close", () => {
		logger.log("Peer closed")
	})

	peer.on("error", error => {
		logger.log("Peer error", error)
	})

	await once(peer, "open")

	logger.log("Peer opened")

	let socketsCount = 0

	makeConnection()

	async function makeConnection() {
		const connection = peer.connect(source)

		connection.on("error", error => {
			logger.log("Connection error", error)
		})

		connection.on("close", () => {
			logger.log("Connection closed")

			logger.log("Retrying connection in 2 seconds")
			setTimeout(makeConnection, 2_000)
		})

		await once(connection, "open")

		logger.log("Connected to remote peer")

		const sockets = createConnectionSockets(logger, connection)

		const server = net.createServer(socket => {
			const socketId = ++socketsCount

			logger.log("New incoming connection", socketId)

			sockets.addSocket(socketId, Promise.resolve(socket))
		})

		connection.on("close", () => {
			logger.log("Closing local server")
			server.close()
		})

		server.listen(destination, () => {
			logger.log(`Local server listening on port ${destination}`)
		})
	}
}

//
//
function createId() {
	const ID_LENGTH = 20
	const buffer = [randomUUIDBuffer()]

	while (true) {
		const result = Buffer.concat(buffer).toString("base64").replace(/[^\w]/g, "").slice(-ID_LENGTH)

		if (result.length === ID_LENGTH) {
			return result
		}

		buffer.push(randomUUIDBuffer())
	}
}

//
//
function randomUUIDBuffer() {
	return Buffer.from(randomUUID().replaceAll("-", ""), "hex")
}

//
//
async function importPeerjs() {
	// order of imports is significant
	Object.assign(global, (await import("@roamhq/wrtc")).default)
	const peerjs = await import("peerjs")
	return /** @type {typeof peerjs} */ (peerjs.default.Peer ? peerjs.default : peerjs)
}

//
//
function createLogger(prefix) {
	const prompt = `[${prefix}]`

	return {
		log(...message) {
			console.log(prompt, new Date().toLocaleString("pl-PL"), ...message)
		},
	}
}

//
//
function createConnectionSockets(
	/** @type {ReturnType<typeof createLogger>} */ logger,
	/** @type {import("peerjs").DataConnection} */ connection,
	/** @type {(() => Promise<import("net").Socket | undefined> | undefined) | undefined} */ createSocket = undefined,
) {
	const sockets = /** @type {Map<number, Promise<import("net").Socket | undefined>>} */ (new Map())

	connection.on("close", async () => {
		logger.log("Closing all sockets")

		void [...sockets.values()].forEach(async socket => (await socket)?.destroySoon())

		sockets.clear()
	})

	connection.on("data", async data => {
		if (!Array.isArray(data)) {
			return logger.log("Ignoring invalid data", data)
		}

		const [socketId, chunk] = data
		const socketPromise = sockets.get(socketId) || addSocket(socketId, createSocket?.())

		socketPromise?.then(socket => {
			if (!socket) return

			if (chunk) {
				socket.write(new Uint8Array(chunk))
			} else {
				sockets.delete(socketId)
				socket.destroySoon()
				logger.log("Socket closed by remote side", socketId)
			}
		})
	})

	function addSocket(
		/**@type {number} */ socketId,
		/** @type {Promise<import("net").Socket | undefined> | undefined} */ socketPromise,
	) {
		if (!socketPromise) return undefined

		sockets.set(socketId, socketPromise)

		socketPromise.then(socket => {
			if (!socket) {
				if (sockets.get(socketId) === socketPromise) {
					sockets.delete(socketId)
				}
				return
			}

			socket.on("data", data => {
				connection.send([socketId, data])
			})

			socket.on("end", () => {
				connection.send([socketId])
				logger.log("Socket closed", socketId)
			})
		})

		return socketPromise
	}

	return {
		addSocket,
	}
}
