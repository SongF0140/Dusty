// Register on initial load so Swup can insert and reconnect friend directories.
class FriendsDirectory extends HTMLElement {
    private controller?: AbortController;
    connectedCallback() {
        this.controller?.abort();
        this.controller = new AbortController();
        const { signal } = this.controller;
        const form = this.querySelector<HTMLFormElement>("[data-friend-form]");
        const preview = this.querySelector<HTMLElement>("[data-friend-preview]");
        const status = this.querySelector<HTMLElement>("[data-copy-status]");
        const defaults: Record<string, string> = { site: "我的博客", url: "https://your-site.com", owner: "你的昵称", desc: "用一句话介绍你的网站…", image: "https://your-site.com/avatar.jpg", color: "#8cae91" };
        const updatePreview = () => {
            if (!form || !preview) return;
            const data = new FormData(form);
            preview.textContent = Object.entries(defaults).map(([key, fallback]) => `${key}: ${JSON.stringify(String(data.get(key) || "").trim() || fallback)}`).join("\n");
            const color = this.querySelector("[data-color-value]");
            if (color) color.textContent = String(data.get("color"));
            if (status) status.textContent = "";
        };
        form?.addEventListener("input", updatePreview, { signal });
        form?.addEventListener("submit", event => event.preventDefault(), { signal });
        this.addEventListener("click", async event => {
            const target = event.target instanceof Element ? event.target : null;
            const copy = target?.closest<HTMLButtonElement>("[data-copy-friend]");
            if (copy && preview && status) {
                try {
                    await navigator.clipboard.writeText(preview.textContent || "");
                    status.textContent = "配置已复制，可以发送给站长了。";
                } catch {
                    status.textContent = "未能复制，请选中上方配置后手动复制。";
                }
            }
        }, { signal });
        this.querySelectorAll<HTMLImageElement>(".friend-node img").forEach(image => {
            const failed = () => { image.hidden = true; };
            image.addEventListener("error", failed, { signal });
            if (image.complete && !image.naturalWidth) failed();
        });
    }
    disconnectedCallback() { this.controller?.abort(); }
}
if (!customElements.get("friends-directory")) customElements.define("friends-directory", FriendsDirectory);
