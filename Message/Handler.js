// TODO: Refactor
// File://home/rose/BOT/SuryaRB/Message/Handler.js
import { performance } from "perf_hooks";
import Feature from "./Feature.js";
import { ApiRequest as api } from "../Utils/ApiRequest.js";
import { Messages } from "../Utils/Messages.js";
import { Prefix } from "../Utils/Prefix.js";
import { Config } from "../config.js";
import { Print } from "../Libs/Print.js";

/**
 * Handles incoming messages
 * @param {import("@whiskeysockets/baileys").BaileysEventMap["messages.upsert"]} upsert - The upsert event
 * @param {import("@whiskeysockets/baileys").WASocket} sock - The socket connection
 */
export async function Handler(upsert, sock) {
	if (upsert.type !== "notify") {
		return;
	}
	const message = Messages(upsert, sock);
	if (!message) {
		return;
	}
	const [isCommand, prefix] = Prefix(message.text);
	const usedPrefix = isCommand ? message.text.split("")[0] : "";

	const command = isCommand
		? message.text.slice(usedPrefix.length).split(/ +/).shift().toLowerCase()
		: "";

	const text = message?.text?.substring(message.text.indexOf(" ") + 1) || "";
	const args = text.split(" ");
	const groupMetadata = message.isGroup
		? await sock.groupMetadata(message.chat)
		: {};
	const isOwner = Config.owners
		.map((x) => x.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
		.includes(message.sender);
	const isAdmin = message.isGroup
		? groupMetadata.participants
				.filter((participant) => participant.admin)
				.map((participant) => participant.id)
				.includes(message.sender)
		: false;

	const feature = Feature;
	if (!feature.isInit) {
		feature.init();
	}

	try {
		for (const name in feature.plugins) {
			const plugin = feature.plugins[name];
			if (plugin?.command.includes(command)) {
				if (plugin.owner && !isOwner) {
					message.reply("Only the owner can use this command.");
					return;
				}
				if (plugin.admin && message.isGroup && !isAdmin) {
					message.reply("Only the admin can use this command.");
					return;
				}
				if (plugin.group && !message.isGroup) {
					message.reply("This command only available in group");
					return;
				}
				if (plugin.private && message.isGroup) {
					message.reply("This commnad only available in private chat");
					return;
				}
				const miscOptions = {
					args,
					sock,
					conn: sock,
					api,
					groupMetadata,
					isOwner,
					isAdmin,
					command,
					text,
					usedPrefix,
				};
				try {
					// this is useless, but as you want
					if (plugin.wait) {
						const waitMessage = Array.isArray(plugin.wait)
							? plugin.wait[Math.floor(Math.random() * plugin.wait.length)]
							: plugin.wait;

						await sock.sendMessage(
							message.chat,
							{
								text: waitMessage
									.replace("%name", message.pushName)
									.replace("%tag", "@" + message.sender.replace(/[^0-9]/g, ""))
									.replace("%group", message.isGroup ? groupMetadata.subject : ""),
								mentions: [message.sender],
							},
							{ quoted: message }
						);
					}
					const old = performance.now();

					// execute
					await plugin.execute(message, miscOptions);

					// this is useless, but as you want
					if (plugin.done) {
						const doneMessage = Array.isArray(plugin.done)
							? plugin.done[Math.floor(Math.random() * plugin.done.length)]
							: plugin.done;
						await sock.sendMessage(
							message.chat,
							{
								text: doneMessage
									.replace("%name", message.pushName)
									.replace("%tag", "@" + message.sender.replace(/^[0-9]/g, ""))
									.replace("%group", message.isGroup ? groupMetadata.subject : "")
									.replace("%exec", `${(performance.now() - old).toFixed(5)} ms`),
								mentions: [message.sender],
							},
							{ quoted: message }
						);
					}
				} catch (error) {
					console.log(error);
					if (plugin.failed && typeof plugin.failed === "string") {
						message.reply(
							plugin.failed.replace("%cmd", command).replace("%error", String(error))
						);
					}
				}
			}
		}
	} catch (error) {
		console.error(error);
	}
	// we don't need to log every message
	Print.info(`From: ${message.sender}
In: ${message.isGroup ? groupMetadata.subject : "Private Chat"}
Type: ${message.mtype}
RawText: ${message.text}
Command: ${isCommand ? command : "None"}
`);
}
