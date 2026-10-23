import { askBlogAssistant, pollBlogAssistant } from "../utils/blog-assistant";
import { BlogQuotaCounter } from "../utils/blog-quota.ts";
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
	for (const block of content.split(/\n\s*\n/)) {
		const lines = block.split("\n");
		if (lines.every((line) => /^\s*(?:[-*]|\d+\.)\s+/.test(line))) {
			const list = document.createElement(
				/^\s*\d+\./.test(lines[0]) ? "ol" : "ul",
			);
			for (const line of lines) {
				const item = document.createElement("li");
				appendInline(item, line.replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
				list.append(item);
			}
			target.append(list);
		} else {
			const paragraph = document.createElement("p");
			appendInline(paragraph, block.replace(/^#{1,4}\s+/gm, ""));
			target.append(paragraph);
		}
	}
}
function appendInline(target: HTMLElement, content: string) {
	let offset = 0;
	for (const match of content.matchAll(
		/\[([^\]\n]+)\]\((\/posts\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`/g,
	)) {
		target.append(document.createTextNode(content.slice(offset, match.index)));
		const element = document.createElement(
			match[2] ? "a" : match[3] ? "strong" : "code",
		);
		element.textContent = match[1] || match[3] || match[4];
		if (element instanceof HTMLAnchorElement) element.href = match[2];
		target.append(element);
		offset = (match.index || 0) + match[0].length;
	}
	target.append(document.createTextNode(content.slice(offset)));
}

interface Pending {
	id: string;
	question: string;
	conversationId: string;
	pagePath?: string;
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
		const lifetime = new AbortController();
		let submissionTail: Promise<void> = Promise.resolve();
		const options = { signal: lifetime.signal };
		const input = required<HTMLTextAreaElement>(this, "textarea");
		const form = required<HTMLFormElement>(this, "form");
		const send = required<HTMLButtonElement>(this, "button[type=submit]");
		const note = required<HTMLElement>(this, "#assistant-send-note");
		const quotaLabel = required<HTMLElement>(this, "[data-assistant-quota]");
		const quotaCounter = new BlogQuotaCounter();
		const renderQuota = () => {
			const quota = quotaCounter.current;
			quotaLabel.hidden = !account;
			quotaLabel.textContent = quota
				? `今日剩余 ${quota.remaining} / ${quota.limit} 次`
				: "次数暂不可用";
		};
		const updateQuota = (value: unknown, acknowledgedId?: string) => {
			quotaCounter.sync(value, acknowledgedId);
			renderQuota();
		};
		let refreshingQuota = false;
		const refreshQuota = async () => {
			if (
				!account ||
				refreshingQuota ||
				quotaCounter.hasReservations ||
				lifetime.signal.aborted
			)
				return;
			refreshingQuota = true;
			const version = quotaCounter.version;
			try {
				const response = await fetch("/api/blog-chat", {
					signal: lifetime.signal,
					cache: "no-store",
				});
				if (!response.ok) throw Error();
				const config = await response.json();
				if (String(config.user?.id) === account) {
					if (version === quotaCounter.version) updateQuota(config.quota);
				} else {
					ready = false;
					updateQuota(null);
				}
			} catch {
				if (!lifetime.signal.aborted && version === quotaCounter.version)
					updateQuota(null);
			} finally {
				refreshingQuota = false;
			}
		};
		const status = required<HTMLElement>(this, "[data-assistant-save-status]");
		const messages = required<HTMLElement>(this, "[data-assistant-messages]");
		const empty = required<HTMLElement>(this, "[data-assistant-empty]");
		const connection = required<HTMLElement>(this, ".assistant-connection");
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
			const follow =
				conversation.scrollHeight -
					conversation.scrollTop -
					conversation.clientHeight <
				90;
			this.dataset.hasMessages = String(state.messages.length > 0);
			empty.hidden = state.messages.length > 0;
			messages.replaceChildren();
			for (const message of state.messages) {
				const article = document.createElement("article");
				article.className = `assistant-message assistant-message-${message.role}`;
				article.setAttribute(
					"aria-label",
					message.role === "user" ? "你的消息" : "StarryLin/Geek 的回复",
				);
				if (message.role === "assistant") {
					const label = document.createElement("span");
					label.textContent = "StarryLin/Geek";
					article.append(label);
				}
				const content = document.createElement("div");
				content.className = "assistant-message-body";
				appendContent(content, message.content);
				article.append(content);
				article.dataset.streaming = String(
					message.role === "assistant" &&
						pending.has(message.id.replace(/-answer$/, "")),
				);
				messages.append(article);
			}
			if (follow) conversation.scrollTop = conversation.scrollHeight;
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
			const showAnswer = (content: string) => {
				const id = `${item.id}-answer`;
				const existing = state.messages.find((message) => message.id === id);
				if (existing) existing.content = content;
				else if (content) {
					const index = state.messages.findIndex(
						(message) => message.id === item.id,
					);
					state.messages.splice(
						index < 0 ? state.messages.length : index + 1,
						0,
						{ id, role: "assistant", content },
					);
				}
			};
			try {
				if (!resume) await previousSubmission;
				signal.throwIfAborted();
				const articles = await corpus(signal);
				const deps = {
					fetch: window.fetch.bind(window),
					signal,
					onQuota: (value: unknown) => {
						if (!signal.aborted) updateQuota(value, item.id);
					},
					onPartial: (text: string) => {
						if (signal.aborted) return;
						showAnswer(text);
						this.dataset.speaking = "true";
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
							pagePath: item.pagePath || "/",
						});
				if (signal.aborted) return;
				showAnswer(result.content);
				this.dataset.speaking = "true";
				clearTimeout(speaking);
				speaking = setTimeout(
					stopSpeaking,
					Math.min(
						6500,
						Math.max(1500, Array.from(result.content).length * 65),
					),
				);
				note.textContent = "";
			} catch (error) {
				if (signal.aborted) return;
				const reason =
					error instanceof Error ? error.message : "请求失败，请稍后重试";
				note.textContent = reason;
				const index = state.messages.findIndex(
					(message) => message.id === item.id,
				);
				state.messages.splice(
					index < 0 ? state.messages.length : index + 1,
					0,
					{
						id: `${item.id}-error`,
						role: "assistant",
						content: `本次未能完成：${reason}\n请重新发送问题。`,
					},
				);
				if (!input.value) input.value = item.question;
			} finally {
				releaseSubmission();
				controllers.delete(controller);
				if (!signal.aborted) {
					quotaCounter.release(item.id);
					renderQuota();
					pending.delete(item.id);
					savePending();
					state.messages = state.messages.slice(-100);
					dirty = true;
					save();
					render();
					void refreshQuota();
				}
			}
		};
		input.value = state.draft;
		render();
		let composing = false;
		input.addEventListener(
			"compositionstart",
			() => {
				composing = true;
			},
			options,
		);
		input.addEventListener(
			"compositionend",
			() => {
				composing = false;
			},
			options,
		);
		input.addEventListener(
			"keydown",
			(event) => {
				if (
					event.key !== "Enter" ||
					event.shiftKey ||
					composing ||
					event.isComposing ||
					event.keyCode === 229
				)
					return;
				event.preventDefault();
				if (!send.disabled) form.requestSubmit();
			},
			options,
		);
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
				quotaCounter.clearReservations();
				renderQuota();
				void refreshQuota();
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
		form.addEventListener(
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
				const item = {
					id: crypto.randomUUID(),
					question,
					conversationId,
					pagePath: location.pathname,
				};
				pending.set(item.id, item);
				quotaCounter.reserve(item.id);
				renderQuota();
				savePending();
				state.messages.push({ id: item.id, role: "user", content: question });
				input.value = "";
				dirty = true;
				save();
				render();
				note.textContent = "";
				conversation.scrollTop = conversation.scrollHeight;
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
					updateQuota(config.quota);
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
					? ""
					: config.authConfigured
						? "请先使用 GitHub 登录"
						: "博主尚未配置 GitHub 登录";
				render();
			})
			.catch(() => {
				if (!lifetime.signal.aborted) {
					connection.textContent = "服务暂不可用";
					note.textContent = "暂时连接不上，请稍后再试";
				}
			});
		window.addEventListener("pagehide", save, options);
		window.addEventListener(
			"focus",
			() => {
				void refreshQuota();
			},
			options,
		);
		const quotaTimer = setInterval(() => {
			const drawer = this.closest<HTMLElement>("#command-navigation");
			if (
				!document.hidden &&
				drawer &&
				!drawer.inert &&
				drawer.dataset.mode === "assistant"
			)
				void refreshQuota();
		}, 60000);
		const drawer = this.closest<HTMLElement>("#command-navigation");
		const quotaVisibility = new MutationObserver(() => {
			if (drawer && !drawer.inert && drawer.dataset.mode === "assistant")
				void refreshQuota();
		});
		if (drawer)
			quotaVisibility.observe(drawer, {
				attributes: true,
				attributeFilter: ["inert", "data-mode"],
			});
		document.addEventListener(
			"visibilitychange",
			() => {
				if (document.hidden) save();
				else void refreshQuota();
			},
			options,
		);
		this.dispose = () => {
			save();
			savePending();
			clearTimeout(timer);
			clearInterval(quotaTimer);
			quotaVisibility.disconnect();
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
