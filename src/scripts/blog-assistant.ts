import { askBlogAssistant, pollBlogAssistant } from "../utils/blog-assistant";
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
		offset = (match.index || 0) + match[0].length;
	}
	target.append(document.createTextNode(content.slice(offset)));
}
interface Pending {
	id: string;
	question: string;
	conversationId: string;
}
class BlogAssistant extends HTMLElement {
	private dispose?: () => void;
	connectedCallback() {
		this.dispose?.();
		let account = "";
		const storage = () => {
			try {
				const local = window.localStorage;
				const suffix = account ? `:github:${account}` : "";
				return {
					getItem: (key: string) => local.getItem(key + suffix),
					setItem: (key: string, value: string) =>
						local.setItem(key + suffix, value),
					removeItem: (key: string) => local.removeItem(key + suffix),
				};
			} catch {
				return null;
			}
		};
		let state = loadAssistantState(storage());
		let ready = false;
		let dirty = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let speaking: ReturnType<typeof setTimeout> | undefined;
		const controllers = new Set<AbortController>();
		const pending = new Map<string, Pending>();
		const statuses = new Map<string, string>();
		const lifetime = new AbortController();
		let submissionTail: Promise<void> = Promise.resolve();
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
		const login = required<HTMLAnchorElement>(this, "[data-assistant-login]");
		const logout = required<HTMLButtonElement>(this, "[data-assistant-logout]");
		const stopSpeaking = () => {
			clearTimeout(speaking);
			this.dataset.speaking = "false";
		};
		const updateSend = () => {
			send.disabled = !ready || !input.value.trim();
			input.disabled = false;
			send.setAttribute("aria-label", "发送消息");
			conversation.setAttribute("aria-busy", String(pending.size > 0));
		};
		const render = () => {
			this.dataset.hasMessages = String(state.messages.length > 0);
			empty.hidden = state.messages.length > 0;
			messages.replaceChildren();
			for (const message of state.messages) {
				const article = document.createElement("article");
				article.className = `assistant-message assistant-message-${message.role}`;
				const label = document.createElement("span");
				label.textContent = message.role === "user" ? "你" : "海问香";
				const content = document.createElement("p");
				appendContent(content, message.content);
				article.append(label, content);
				if (pending.has(message.id)) {
					const progress = document.createElement("small");
					progress.textContent =
						statuses.get(message.id) === "running"
							? "正在回答…"
							: "已进入队列，等待当前回答完成…";
					article.append(progress);
				}
				messages.append(article);
			}
			conversation.scrollTop = conversation.scrollHeight;
			updateSend();
		};
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
		const savePending = () => {
			try {
				storage()?.setItem(
					"dusty:assistant-pending",
					JSON.stringify([...pending.values()]),
				);
			} catch {
				/* Pending jobs remain in Neon. */
			}
		};
		const corpus = async (signal: AbortSignal): Promise<BlogArticle[]> => {
			const response = await fetch("/api/rag/articles.json", { signal });
			if (!response.ok) throw new Error("文章目录暂不可用");
			return response.json();
		};
		const waitFor = async (item: Pending, resume = false) => {
			let releaseSubmission = () => {};
			const previousSubmission = submissionTail;
			if (!resume)
				submissionTail = new Promise<void>((resolve) => {
					releaseSubmission = resolve;
				});
			const controller = new AbortController();
			controllers.add(controller);
			const signal = AbortSignal.any([controller.signal, lifetime.signal]);
			try {
				if (!resume) await previousSubmission;
				signal.throwIfAborted();
				const articles = await corpus(signal);
				const deps = {
					fetch: window.fetch.bind(window),
					signal,
					onStatus: (value: string) => {
						statuses.set(item.id, value);
						render();
					},
				};
				const result = resume
					? await pollBlogAssistant(item.id, articles, deps)
					: await askBlogAssistant(item.question, articles, {
							...deps,
							requestId: item.id,
							onEnqueued: releaseSubmission,
							conversationId: item.conversationId,
							pagePath: location.pathname,
							search: async (query) => {
								if (!window.pagefind) {
									const path = "/pagefind/pagefind.js";
									window.pagefind = await import(/* @vite-ignore */ path);
								}
								return window.pagefind.search(query);
							},
						});
				if (signal.aborted) return;
				const answer = {
					id: `${item.id}-answer`,
					role: "assistant" as const,
					content: result.content,
				};
				if (!state.messages.some((message) => message.id === answer.id)) {
					const index = state.messages.findIndex(
						(message) => message.id === item.id,
					);
					state.messages.splice(
						index < 0 ? state.messages.length : index + 1,
						0,
						answer,
					);
				}
				this.dataset.speaking = "true";
				clearTimeout(speaking);
				speaking = setTimeout(
					stopSpeaking,
					Math.min(
						6500,
						Math.max(1500, Array.from(result.content).length * 65),
					),
				);
				note.textContent = "仅提供站内博文链接";
			} catch (error) {
				if (signal.aborted) return;
				note.textContent =
					error instanceof Error ? error.message : "请求失败，请稍后重试";
				if (!input.value) input.value = item.question;
			} finally {
				releaseSubmission();
				controllers.delete(controller);
				if (!signal.aborted) {
					pending.delete(item.id);
					statuses.delete(item.id);
					savePending();
					state.messages = state.messages.slice(-100);
					dirty = true;
					save();
					render();
				}
			}
		};
		input.value = state.draft;
		render();
		input.addEventListener(
			"input",
			() => {
				dirty = true;
				updateSend();
				clearTimeout(timer);
				timer = setTimeout(save, 250);
			},
			options,
		);
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
				for (const controller of controllers) controller.abort();
				controllers.clear();
				pending.clear();
				statuses.clear();
				savePending();
				stopSpeaking();
				clearTimeout(timer);
				state = { version: 1, draft: "", messages: [] };
				input.value = "";
				dirty = false;
				render();
				status.textContent = "本地记录已清空；已提交的任务会继续完成";
				hideConfirm();
			},
			options,
		);
		this.addEventListener(
			"click",
			(event) => {
				const button = (event.target as Element).closest<HTMLButtonElement>(
					"[data-assistant-prompt]",
				);
				if (!button) return;
				if (!input.value.trim())
					input.value = button.dataset.assistantPrompt || "";
				dirty = true;
				updateSend();
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
			(event) => {
				event.preventDefault();
				if (send.disabled) return;
				const question = input.value.trim();
				if (question.length > 4000) {
					note.textContent = "问题请控制在 4000 字以内";
					return;
				}
				let conversationId: string = crypto.randomUUID();
				try {
					const saved = storage()?.getItem("dusty:assistant-conversation");
					if (saved && /^[\w-]{1,128}$/.test(saved)) conversationId = saved;
					storage()?.setItem("dusty:assistant-conversation", conversationId);
				} catch {
					/* Questions can still be sent when browser storage is blocked. */
				}
				const item = { id: crypto.randomUUID(), question, conversationId };
				pending.set(item.id, item);
				savePending();
				state.messages.push({ id: item.id, role: "user", content: question });
				input.value = "";
				dirty = true;
				save();
				render();
				note.textContent = "已提交；可以继续发送，新消息优先等待。";
				void waitFor(item);
			},
			options,
		);
		login.href = `/api/blog-auth?action=login&returnTo=${encodeURIComponent(location.pathname + location.search)}`;
		logout.addEventListener(
			"click",
			async () => {
				await fetch("/api/blog-auth?action=logout", { method: "POST" });
				location.reload();
			},
			options,
		);
		fetch("/api/blog-chat", { signal: lifetime.signal })
			.then(async (response) => {
				if (!response.ok) throw Error();
				const config = await response.json();
				ready = config.configured === true && Boolean(config.user);
				login.hidden = Boolean(config.user);
				logout.hidden = !config.user;
				if (config.user) {
					const guestDraft = input.value;
					account = String(config.user.id);
					state = loadAssistantState(storage());
					input.value = state.draft || guestDraft;
					try {
						const saved = JSON.parse(
							storage()?.getItem("dusty:assistant-pending") || "[]",
						);
						if (Array.isArray(saved))
							for (const item of saved.slice(-20))
								if (
									item &&
									typeof item.id === "string" &&
									typeof item.question === "string" &&
									typeof item.conversationId === "string"
								)
									pending.set(item.id, item);
					} catch {
						/* Invalid local pending records are ignored. */
					}
					connection.textContent = `GitHub · ${config.user.login}`;
					for (const item of pending.values()) void waitFor(item, true);
				} else
					connection.textContent = config.authConfigured
						? "请使用 GitHub 登录"
						: "等待 GitHub 登录配置";
				note.textContent = ready
					? "每人每天 20 次 · 新消息优先等待，不打断当前回答"
					: config.authConfigured
						? "请先使用 GitHub 登录"
						: "博主尚未配置 GitHub 登录";
				preview.textContent =
					"StarryLin 博客陪读。知识回答优先依据博客，扩展内容单独标注。任务在服务端排队，离开页面不会取消正在回答的任务。";
				render();
			})
			.catch(() => {
				if (!lifetime.signal.aborted) {
					connection.textContent = "服务暂不可用";
					note.textContent = "请稍后重试；本地接口需使用 Vercel dev";
				}
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
			save();
			savePending();
			clearTimeout(timer);
			stopSpeaking();
			for (const controller of controllers) controller.abort();
			lifetime.abort();
		};
	}
	disconnectedCallback() {
		this.dispose?.();
	}
}
if (!customElements.get("haiwenxiang-assistant"))
	customElements.define("haiwenxiang-assistant", BlogAssistant);
