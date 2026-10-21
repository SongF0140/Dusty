export type NavigationMode = "terminal" | "assistant";
export type AssistantMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
};
export type AssistantState = {
	version: 1;
	draft: string;
	messages: AssistantMessage[];
};
type BrowserStore = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;

export const NAVIGATION_MODE_KEY = "dusty:navigation-mode:v1";
export const ASSISTANT_STORAGE_KEY = "dusty:haiwenxiang:v1";
const MAX_TEXT = 12_000;
const MAX_MESSAGES = 100;

const emptyState = (): AssistantState => ({
	version: 1,
	draft: "",
	messages: [],
});

function normalizeState(value: unknown): AssistantState {
	if (
		!value ||
		typeof value !== "object" ||
		!("version" in value) ||
		value.version !== 1
	)
		return emptyState();
	const candidate = value as Partial<AssistantState>;
	const messages: AssistantMessage[] = [];
	if (Array.isArray(candidate.messages)) {
		for (const message of candidate.messages.slice(-MAX_MESSAGES)) {
			if (
				!message ||
				typeof message !== "object" ||
				typeof message.id !== "string" ||
				!message.id ||
				!["user", "assistant"].includes(message.role) ||
				typeof message.content !== "string"
			)
				continue;
			messages.push({
				id: message.id.slice(0, 128),
				role: message.role,
				content: message.content.slice(0, MAX_TEXT),
			});
		}
	}
	return {
		version: 1,
		draft:
			typeof candidate.draft === "string"
				? candidate.draft.slice(0, MAX_TEXT)
				: "",
		messages,
	};
}

export function readNavigationMode(storage: BrowserStore): NavigationMode {
	try {
		return storage?.getItem(NAVIGATION_MODE_KEY) === "assistant"
			? "assistant"
			: "terminal";
	} catch {
		return "terminal";
	}
}

export function saveNavigationMode(
	storage: BrowserStore,
	mode: NavigationMode,
): boolean {
	try {
		if (!storage) return false;
		storage.setItem(NAVIGATION_MODE_KEY, mode);
		return true;
	} catch {
		return false;
	}
}

export function loadAssistantState(storage: BrowserStore): AssistantState {
	try {
		const raw = storage?.getItem(ASSISTANT_STORAGE_KEY);
		return raw && raw.length <= 2_000_000
			? normalizeState(JSON.parse(raw))
			: emptyState();
	} catch {
		return emptyState();
	}
}

export function saveAssistantState(
	storage: BrowserStore,
	state: AssistantState,
): boolean {
	try {
		if (!storage) return false;
		storage.setItem(
			ASSISTANT_STORAGE_KEY,
			JSON.stringify(normalizeState(state)),
		);
		return true;
	} catch {
		return false;
	}
}

export function clearAssistantState(storage: BrowserStore): boolean {
	try {
		if (!storage) return false;
		storage.removeItem(ASSISTANT_STORAGE_KEY);
		return true;
	} catch {
		return false;
	}
}
