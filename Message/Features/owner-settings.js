export default {
	command: ["setting"],
	description: "Set the bot settings.",
	category: "Owner",
	owner: true,
	admin: false,
	hidden: false,
	limit: false,
	group: false,
	private: false,

	/**
	 * @param {import("../../Utils/Messages").ExtendedWAMessage} m - The message object.
	 * @param {import("../Handler").miscOptions} options - The options.
	 */
	execute: async function (m, { sock, args, db }) {
		const setting = db.settings.set(sock.user.id);
		const [key, value] = args;
		if (!key || !setting[key]) {
			return m.reply(
				`Available options\n\nOptions:\n${Object.keys(setting)
					.map((a) => "- " + a)
					.join("\n")}`
			);
		}
		// any value -> Boolean
		setting[key] = value === "true" ? true : value === "false" ? false : value;
		return m.reply(`The ${key} setting has been changed to ${value}`);
	},
	failed: "Failed to execute the %cmd command\n\n%error",
	wait: null,
	done: null,
};
