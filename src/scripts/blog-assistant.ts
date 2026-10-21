import { askBlogAssistant } from "../utils/blog-assistant";
import type { BlogArticle } from "../utils/blog-rag";
import {
	clearAssistantState,
	loadAssistantState,
	saveAssistantState,
} from "../utils/navigation-assistant-state";

function required<T extends Element>(root: ParentNode, selector: string): T {
	const element = root.querySelector<T>(selector);
	if (!element) throw new Error(`助手界面缺少元素：${selector}`);
	return element;
}

function appendContent(target: HTMLElement, content: string) {
	let offset = 0;
	for (const match of content.matchAll(
		/\[([^\]\n]+)\]\((\/posts\/[^\s)]+)\)/g,
	)) {
		target.append(document.createTextNode(content.slice(offset, match.index)));
		const link = document.createElement("a");
		link.textContent = match[1];
		link.href = match[2];
		target.append(link);
		offset = (match.index ?? 0) + match[0].length;
	}
	target.append(document.createTextNode(content.slice(offset)));
}

class BlogAssistant extends HTMLElement {
	private dispose?: () => void;
	connectedCallback() {
		this.dispose?.();
		const storage = () => {
			try {
				return window.localStorage;
			} catch {
				return null;
			}
		};
		let state = loadAssistantState(storage());
		let dirty = false;
		let busy = false;
		let ready = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let speakingTimer: ReturnType<typeof setTimeout> | undefined;
		const stopSpeaking = () => {
			clearTimeout(speakingTimer);
			this.dataset.speaking = "false";
		};
		const speakAnswer = (text: string) => {
			stopSpeaking();
			this.dataset.speaking = "true";
			speakingTimer = setTimeout(stopSpeaking, Math.min(6500, Math.max(1500, Array.from(text).length * 65)));
		};
		let request: AbortController | undefined;
		const lifetime = new AbortController();
		const options = { signal: lifetime.signal };
		const input = required<HTMLTextAreaElement>(this, "textarea");
		const send = required<HTMLButtonElement>(this, "button[type=submit]");
		const note = required<HTMLElement>(this, "#assistant-send-note");
		const status = required<HTMLElement>(this, "[data-assistant-save-status]");
		const messages = required<HTMLElement>(this, "[data-assistant-messages]");
		const empty = required<HTMLElement>(this, "[data-assistant-empty]");
		const connection = required<HTMLElement>(this, ".assistant-connection");
		const preview = required<HTMLElement>(this, ".assistant-preview-note");
		const confirmation = required<HTMLElement>(
			this,
			"[data-assistant-confirm]",
		);
		const clear = required<HTMLButtonElement>(this, "[data-assistant-clear]");
		const cancel = required<HTMLButtonElement>(this, "[data-assistant-cancel]");
		const confirm = required<HTMLButtonElement>(
			this,
			"[data-assistant-confirm-clear]",
		);
		const conversation = required<HTMLElement>(this, ".assistant-conversation");
		const updateSend = () => {
			send.disabled = !ready || busy || !input.value.trim();
			input.disabled = busy;
			send.setAttribute("aria-label", busy ? "正在回答" : "发送消息");
			conversation.setAttribute("aria-busy", String(busy));
		};
		const render = (pending?: string) => {
			empty.hidden = state.messages.length > 0 || !!pending;
			messages.replaceChildren();
			for (const message of [
				...state.messages,
				...(pending ? [{ role: "user", content: pending }] : []),
			]) {
				const article = document.createElement("article");
				article.className = `assistant-message assistant-message-${message.role}`;
				const label = document.createElement("span");
				label.textContent = message.role === "user" ? "你" : "海问香";
				const content = document.createElement("p");
				appendContent(content, message.content);
				article.append(label, content);
				messages.append(article);
			}
			conversation.scrollTop = conversation.scrollHeight;
		};
		input.value = state.draft;
		if (state.draft || state.messages.length)
			status.textContent = "已恢复此浏览器的记录";
		if (!storage()) status.textContent = "浏览器存储不可用，暂未保存";
		render();
		updateSend();
		const save = () => {
			clearTimeout(timer);
			if (!dirty) return;
			state.draft = input.value;
			const ok = saveAssistantState(storage(), state);
			status.textContent = ok
				? "对话和草稿已保存在此浏览器"
				: "浏览器存储不可用，暂未保存";
			if (ok) dirty = false;
		};
		const onInput = () => {
			dirty = true;
			updateSend();
			clearTimeout(timer);
			timer = setTimeout(save, 250);
		};
		input.addEventListener("input", onInput, options);
		input.addEventListener("blur", save, options);
		const hideConfirm = () => {
			confirmation.hidden = true;
			clear.focus({ preventScroll: true });
		};
		clear.addEventListener(
			"click",
			() => {
				confirmation.hidden = false;
				cancel.focus();
			},
			options,
		);
		cancel.addEventListener("click", hideConfirm, options);
		confirm.addEventListener(
			"click",
			() => {
				if (!clearAssistantState(storage())) {
					status.textContent = "浏览器存储不可用，未能清空记录";
					hideConfirm();
					return;
				}
				request?.abort();
				stopSpeaking();
				request = undefined;
				busy = false;
				clearTimeout(timer);
				dirty = false;
				state = { version: 1, draft: "", messages: [] };
				input.value = "";
				render();
				updateSend();
				note.textContent = ready
					? "博文优先 · 扩展内容标注"
					: "尚未配置模型服务";
				status.textContent = "对话和草稿已清空";
				hideConfirm();
				input.focus();
			},
			options,
		);
		this.addEventListener(
			"click",
			(event) => {
				const button = (event.target as Element).closest<HTMLButtonElement>(
					"[data-assistant-prompt]",
				);
				if (!button || busy) return;
				if (!input.value.trim()) {
					input.value = button.dataset.assistantPrompt || "";
					onInput();
				}
				input.focus();
			},
			options,
		);
		this.addEventListener(
			"keydown",
			(event) => {
				if (event.key === "Escape" && !confirmation.hidden) {
					event.preventDefault();
					event.stopPropagation();
					hideConfirm();
				}
			},
			options,
		);
		required<HTMLFormElement>(this, "form").addEventListener(
			"submit",
			async (event) => {
				event.preventDefault();
				if (send.disabled) return;
				const question = input.value.trim();
				if (question.length > 4000) {
					note.textContent = "问题请控制在 4000 字以内";
					return;
				}
				const active = new AbortController();
				stopSpeaking();
				request = active;
				busy = true;
				save();
				updateSend();
				render(question);
				note.textContent = "正在检索博文并阅读原文…";
				try {
					const response = await fetch("/api/rag/articles.json", {
						signal: active.signal,
					});
					if (!response.ok) throw new Error("文章目录暂时不可用");
					const corpus: BlogArticle[] = await response.json();
					const result = await askBlogAssistant(
						question,
						corpus,
						{
							pagePath: location.pathname,
							signal: active.signal,
							fetch: window.fetch.bind(window),
							search: async (query) => {
								if (!window.pagefind) {
									const path = "/pagefind/pagefind.js";
									window.pagefind = await import(/* @vite-ignore */ path);
								}
								return window.pagefind.search(query);
							},
						},
						state.messages,
					);
					if (active.signal.aborted) return;
					state.messages.push(
						{ id: crypto.randomUUID(), role: "user", content: question },
						{
							id: crypto.randomUUID(),
							role: "assistant",
							content: result.content,
						},
					);
					state.messages = state.messages.slice(-100);
					input.value = "";
					dirty = true;
					save();
					render();
					speakAnswer(result.content);
					note.textContent = "仅提供站内博文链接";
				} catch (error) {
					if (active.signal.aborted) return;
					render();
					note.textContent =
						error instanceof Error ? error.message : "请求失败，请稍后重试";
				} finally {
					if (request === active) {
						busy = false;
						request = undefined;
						updateSend();
					}
				}
			},
			options,
		);
		connection.textContent = "正在检查连接";
		fetch("/api/blog-chat", { signal: lifetime.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error();
				const config = await response.json();
				ready = config.configured === true;
				connection.textContent = ready ? "博文问答" : "等待模型配置";
				note.textContent = ready
					? "博文优先 · 扩展内容标注"
					: "尚未配置模型服务";
				preview.textContent = ready
					? "可以聊聊，也可以一起读博文。知识回答优先依据博客，扩展内容单独标注，仅提供站内博文链接。对话仅保存在此浏览器。"
					: "模型服务尚未配置。你可以先写下问题，草稿会保存在此浏览器。";
				updateSend();
			})
			.catch(() => {
				if (lifetime.signal.aborted) return;
				connection.textContent = "服务暂不可用";
				note.textContent = "请稍后重试；本地预览需使用 Vercel dev";
			});
		window.addEventListener("pagehide", save, options);
		document.addEventListener(
			"visibilitychange",
			() => {
				if (document.hidden) save();
			},
			options,
		);
		this.dispose = () => {
			stopSpeaking();
			save();
			clearTimeout(timer);
			request?.abort();
			lifetime.abort();
		};
	}
	disconnectedCallback() {
		this.dispose?.();
	}
}

if (!customElements.get("haiwenxiang-assistant"))
	customElements.define("haiwenxiang-assistant", BlogAssistant);
